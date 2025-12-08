#!/bin/bash
set -euo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Network Settings (Injective Testnet)
NODE="https://testnet.sentry.tm.injective.network:443"
CHAIN_ID="injective-888"
FEES="8000000000000000inj" # 0.002 INJ
GAS="50000000"             # High gas limit to prevent out-of-gas errors during instantiation
KEY_NAME="testnet"
PASSWORD="12345678" 

# Addresses
# Replace this with your actual wallet address associated with KEY_NAME
DEPLOYER_ADDRESS="inj1q2m26a7jdzjyfdn545vqsude3zwwtfrdap5jgz"

# Game Configuration
SPIN_COST="1000000000000000000" # 1.0 INJ (18 decimals)
PAYMENT_DENOM="inj"
MINT_COST="500000000000000000"  # 0.5 INJ (18 decimals)

# Pyth Oracle Configuration (Injective Testnet)
# Verify these against official docs if needed. 
PYTH_CONTRACT_ADDR="inj18rlflp3735h25jmjx97d22c72sxk260amdjxlu"
PYTH_PRICE_FEED_ID="2d9315a88f3019f8efa88dfe9c0f0843712da0bac814461e27733f6b83eb51b3"

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

store_contract() {
    local wasm_file="$1"
    echo "📦 Storing contract: $wasm_file..." >&2
    
    # 1. Store Code
    local tx_output
    tx_output=$(yes "$PASSWORD" | injectived tx wasm store "$wasm_file" \
      --from="$KEY_NAME" \
      --chain-id="$CHAIN_ID" \
      --yes --fees="$FEES" --gas="$GAS" \
      --node="$NODE" 2>&1)

    if echo "$tx_output" | grep -q 'error:'; then
        echo "❌ ERROR storing contract: $tx_output" >&2
        exit 1
    fi
      
    txhash=$(echo "$tx_output" | grep -o 'txhash: [A-F0-9]*' | awk '{print $2}')
    echo "  - Transaction hash: $txhash" >&2
    
    sleep 6
    
    query_output=$(injectived query tx "$txhash" --node="$NODE")
    code_id=$(echo "$query_output" | grep -A 1 'key: code_id' | grep 'value:' | head -1 | sed 's/.*value: "\(.*\)".*/\1/')
    
    if [ -z "$code_id" ]; then
        echo "❌ ERROR: Failed to retrieve code_id for txhash: $txhash." >&2
        exit 1
    fi
    echo "$code_id"
}

instantiate_contract() {
    local code_id="$1"
    local init_msg="$2"
    local label="$3"
    local admin="$4"
    
    echo "🛠 Instantiating contract (Code ID: $code_id, Label: $label)..." >&2

    # 1. Instantiate
    local tx_output
    tx_output=$(yes "$PASSWORD" | injectived tx wasm instantiate "$code_id" "$init_msg" \
      --label="$label" \
      --admin="$admin" \
      --from="$KEY_NAME" \
      --chain-id="$CHAIN_ID" \
      --yes --fees="$FEES" --gas="$GAS" \
      --node="$NODE"  2>&1)

    txhash=$(echo "$tx_output" | grep -o 'txhash: [A-F0-9]*' | awk '{print $2}')
    sleep 6 # Increased sleep to ensure tx is indexed
    query_output=$(injectived query tx "$txhash" --node="$NODE")
    contract_address=$(echo "$query_output" \
    | grep -A 1 'key: contract_address' \
    | grep 'value:' \
    | head -1 \
    | sed "s/.*value: //; s/['\"]//g")
    
    if [ -z "$contract_address" ]; then
        echo "❌ ERROR: Failed to retrieve contract_address for txhash: $txhash." >&2
        echo "Full query output: $query_output" >&2
        exit 1
    fi

    echo "$contract_address"
}

execute_contract() {
    local contract_addr="$1"
    local exec_msg="$2"
    local action_name="$3"
    
    echo "🔧 Executing '$action_name' on $contract_addr..." >&2
    echo $exec_msg >&2

    tx_output=$(yes "$PASSWORD" | injectived tx wasm execute "$contract_addr" "$exec_msg" \
    --from="$KEY_NAME" \
    --chain-id="$CHAIN_ID" \
    --yes --fees="$FEES" --gas="$GAS" \
    --node="$NODE" 2>&1) || true
      
    txhash=$(echo "$tx_output" | grep -o 'txhash: [A-F0-9]*' | awk '{print $2}')

    if echo "$tx_output" | grep -q 'error:'; then
        echo "❌ ERROR executing contract: $tx_output" >&2
        exit 1
    fi
    
    txhash=$(echo "$tx_output" | grep -o 'txhash: [A-F0-9]*' | awk '{print $2}')
    echo "  - Transaction hash: $txhash" >&2
    sleep 2
}

# ==============================================================================
# MAIN DEPLOYMENT LOGIC
# ==============================================================================

echo "🚀 STARTING DEPLOYMENT"
echo "======================"
echo "Chain:    $CHAIN_ID"
echo "Deployer: $DEPLOYER_ADDRESS"
echo ""

# ------------------------------------------------------------------------------
# STEP 1: UPLOAD CODE
# ------------------------------------------------------------------------------

echo "--- 1. Uploading Contracts ---"
CW721_CODE_ID=$(store_contract "artifacts/cw721_spore.wasm")
echo "✅ CW721 Code ID: $CW721_CODE_ID"

GAME_CODE_ID=$(store_contract "artifacts/spore_game_controller.wasm")
echo "✅ Game Code ID:  $GAME_CODE_ID"
echo ""

# ------------------------------------------------------------------------------
# STEP 2: INSTANTIATE CW721 (INITIALLY OWNED BY DEPLOYER)
# ------------------------------------------------------------------------------

echo "--- 2. Instantiating CW721 ---"
# We set 'minter' to DEPLOYER_ADDRESS. 
# cw-ownable logic in `instantiate` will make the DEPLOYER the initial Admin.
INIT_CW721=$(jq -n --arg minter "$DEPLOYER_ADDRESS" '{
  name: "Spore Fates",
  symbol: "SPORE",
  minter: $minter
}')

CW721_ADDRESS=$(instantiate_contract "$CW721_CODE_ID" "$INIT_CW721" "spore-nft" "$DEPLOYER_ADDRESS")
echo "✅ CW721 Address: $CW721_ADDRESS"
echo ""

# ------------------------------------------------------------------------------
# STEP 3: INSTANTIATE GAME CONTROLLER
# ------------------------------------------------------------------------------

echo "--- 3. Instantiating Game Controller ---"
INIT_GAME=$(jq -n \
  --arg payment "$PAYMENT_DENOM" \
  --arg cost "$SPIN_COST" \
  --arg mint_cost "$MINT_COST" \
  --arg pyth "$PYTH_CONTRACT_ADDR" \
  --arg feed "$PYTH_PRICE_FEED_ID" \
  --arg cw721 "$CW721_ADDRESS" \
  '{
    payment_denom: $payment,
    spin_cost: $cost,
    mint_cost: $mint_cost,
    pyth_contract_addr: $pyth,
    price_feed_id: $feed,
    cw721_addr: $cw721
  }')

GAME_ADDRESS=$(instantiate_contract "$GAME_CODE_ID" "$INIT_GAME" "spore-game" "$DEPLOYER_ADDRESS")
echo "✅ Game Address: $GAME_ADDRESS"
echo ""

# CW721_ADDRESS=inj10d50mm7suxgk7ragudf8epqqlkel7rxtf78uex
# GAME_ADDRESS=inj1j845vkvvnr8m7v9s3emgme3sp5ru79mu8xvk6k

# ------------------------------------------------------------------------------
# STEP 4: TRANSFER MINTER OWNERSHIP (2-STEP PROCESS)
# ------------------------------------------------------------------------------

echo "--- 4. Transferring Minter Ownership of CW721 to Game ---"

# 4a. Propose Transfer (CW721: update_ownership -> transfer_ownership)
# This uses cw-ownable standard message
PROPOSE_MSG=$(jq -n --arg new_owner "$GAME_ADDRESS" '{
  update_minter_ownership: {
    transfer_ownership: {
      new_owner: $new_owner,
      expiry: null
    }
  }
}')

execute_contract "$CW721_ADDRESS" "$PROPOSE_MSG" "Propose Transfer"
echo "✅ Ownership offered to Game Contract."

# 4b. Accept Transfer (Game: accept_ownership -> Calls CW721: accept_ownership)
# This uses the custom function we added to the Game Controller
ACCEPT_MSG=$(jq -n --arg cw721 "$CW721_ADDRESS" '{
  accept_minter_ownership: {
    cw721_contract: $cw721
  }
}')

execute_contract "$GAME_ADDRESS" "$ACCEPT_MSG" "Accept Ownership"
echo "✅ Game Contract has accepted minter ownership."
echo ""

# ------------------------------------------------------------------------------
# STEP 4: TRANSFER OWNERSHIP (2-STEP PROCESS)
# ------------------------------------------------------------------------------

echo "--- 4. Transferring Creator Ownership of CW721 to Game ---"

# 4a. Propose Transfer (CW721: update_ownership -> transfer_ownership)
# This uses cw-ownable standard message
PROPOSE_MSG=$(jq -n --arg new_owner "$GAME_ADDRESS" '{
  update_creator_ownership: {
    transfer_ownership: {
      new_owner: $new_owner,
      expiry: null
    }
  }
}')

execute_contract "$CW721_ADDRESS" "$PROPOSE_MSG" "Propose Transfer"
echo "✅ Ownership offered to Game Contract."

# 4b. Accept Transfer (Game: accept_ownership -> Calls CW721: accept_ownership)
# This uses the custom function we added to the Game Controller
ACCEPT_MSG=$(jq -n --arg cw721 "$CW721_ADDRESS" '{
  accept_creator_ownership: {
    cw721_contract: $cw721
  }
}')

execute_contract "$GAME_ADDRESS" "$ACCEPT_MSG" "Accept Ownership"
echo "✅ Game Contract has accepted creator ownership."
echo ""

# ==============================================================================
# SUMMARY
# ==============================================================================

echo "🎉 DEPLOYMENT COMPLETE"
echo "======================"
echo "CW721 Address: $CW721_ADDRESS"
echo "Game Address:  $GAME_ADDRESS"
echo "Owner of NFT:  $GAME_ADDRESS"