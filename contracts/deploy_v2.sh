#!/bin/bash
set -euo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Network Settings (Injective Testnet)
NODE="https://testnet.sentry.tm.injective.network:443"
CHAIN_ID="injective-888"
FEES="8000000000000000inj" # 0.002 INJ
GAS="50000000"             # High gas limit
KEY_NAME="testnet"
PASSWORD="12345678" 

# Addresses
DEPLOYER_ADDRESS="inj1q2m26a7jdzjyfdn545vqsude3zwwtfrdap5jgz"

# Game Configuration
PAYMENT_DENOM="inj"
SPIN_COST="10000000000000000"  # 0.01 INJ
MINT_COST="10000000000000000"   # 0.01 INJ (Base Price)
MINT_SLOPE="1000000000000000"   # 0.001 INJ (Increment per mint)

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

store_contract() {
    local wasm_file="$1"
    echo "📦 Storing contract: $wasm_file..." >&2
    
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

    local tx_output
    tx_output=$(yes "$PASSWORD" | injectived tx wasm instantiate "$code_id" "$init_msg" \
      --label="$label" \
      --admin="$admin" \
      --from="$KEY_NAME" \
      --chain-id="$CHAIN_ID" \
      --yes --fees="$FEES" --gas="$GAS" \
      --node="$NODE"  2>&1)

    txhash=$(echo "$tx_output" | grep -o 'txhash: [A-F0-9]*' | awk '{print $2}')
    sleep 6 
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
    
    echo "  - Transaction hash: $txhash" >&2
    sleep 2
}

# ==============================================================================
# MAIN DEPLOYMENT LOGIC
# ==============================================================================

echo "🚀 STARTING DEPLOYMENT (V2 - Drand + Bonding Curve)"
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

ORACLE_CODE_ID=$(store_contract "artifacts/drand_oracle.wasm")
echo "✅ Oracle Code ID: $ORACLE_CODE_ID"

GAME_CODE_ID=$(store_contract "artifacts/spore_game_controller.wasm")
echo "✅ Game Code ID:  $GAME_CODE_ID"
echo ""

# ------------------------------------------------------------------------------
# STEP 2: INSTANTIATE CW721
# ------------------------------------------------------------------------------

echo "--- 2. Instantiating CW721 ---"
INIT_CW721=$(jq -n --arg minter "$DEPLOYER_ADDRESS" '{
  name: "Spore Fates",
  symbol: "SPORE",
  minter: $minter
}')

CW721_ADDRESS=$(instantiate_contract "$CW721_CODE_ID" "$INIT_CW721" "spore-nft" "$DEPLOYER_ADDRESS")
echo "✅ CW721 Address: $CW721_ADDRESS"
echo ""

# ------------------------------------------------------------------------------
# STEP 3: INSTANTIATE DRAND ORACLE
# ------------------------------------------------------------------------------

echo "--- 3. Instantiating Drand Oracle ---"
# Oracle usually takes empty init msg or owner config depending on implementation.
# Assuming empty per standard cw-drand-oracle.
INIT_ORACLE='{}'

ORACLE_ADDRESS=$(instantiate_contract "$ORACLE_CODE_ID" "$INIT_ORACLE" "spore-oracle" "$DEPLOYER_ADDRESS")
echo "✅ Oracle Address: $ORACLE_ADDRESS"
echo ""

# ------------------------------------------------------------------------------
# STEP 4: INSTANTIATE GAME CONTROLLER
# ------------------------------------------------------------------------------

echo "--- 4. Instantiating Game Controller ---"
INIT_GAME=$(jq -n \
  --arg payment "$PAYMENT_DENOM" \
  --arg cost "$SPIN_COST" \
  --arg mint_cost "$MINT_COST" \
  --arg slope "$MINT_SLOPE" \
  --arg oracle "$ORACLE_ADDRESS" \
  --arg cw721 "$CW721_ADDRESS" \
  '{
    payment_denom: $payment,
    spin_cost: $cost,
    mint_cost: $mint_cost,
    mint_cost_increment: $slope,
    oracle_addr: $oracle,
    cw721_addr: $cw721
  }')

GAME_ADDRESS=$(instantiate_contract "$GAME_CODE_ID" "$INIT_GAME" "spore-game" "$DEPLOYER_ADDRESS")
echo "✅ Game Address: $GAME_ADDRESS"
echo ""

# ------------------------------------------------------------------------------
# STEP 5: TRANSFER CW721 OWNERSHIP
# ------------------------------------------------------------------------------

echo "--- 5. Transferring CW721 Ownership to Game ---"

# 5a. Minter Ownership
PROPOSE_MSG=$(jq -n --arg new_owner "$GAME_ADDRESS" '{
  update_minter_ownership: {
    transfer_ownership: {
      new_owner: $new_owner,
      expiry: null
    }
  }
}')
execute_contract "$CW721_ADDRESS" "$PROPOSE_MSG" "Propose Minter Transfer"

ACCEPT_MSG=$(jq -n --arg cw721 "$CW721_ADDRESS" '{
  accept_minter_ownership: {
    cw721_contract: $cw721
  }
}')
execute_contract "$GAME_ADDRESS" "$ACCEPT_MSG" "Accept Minter Ownership"

# 5b. Creator Ownership
PROPOSE_CREATOR_MSG=$(jq -n --arg new_owner "$GAME_ADDRESS" '{
  update_creator_ownership: {
    transfer_ownership: {
      new_owner: $new_owner,
      expiry: null
    }
  }
}')
execute_contract "$CW721_ADDRESS" "$PROPOSE_CREATOR_MSG" "Propose Creator Transfer"

ACCEPT_CREATOR_MSG=$(jq -n --arg cw721 "$CW721_ADDRESS" '{
  accept_creator_ownership: {
    cw721_contract: $cw721
  }
}')
execute_contract "$GAME_ADDRESS" "$ACCEPT_CREATOR_MSG" "Accept Creator Ownership"

echo ""
# ==============================================================================
# SUMMARY
# ==============================================================================

echo "🎉 DEPLOYMENT COMPLETE"
echo "======================"
echo "CW721 Address:  $CW721_ADDRESS"
echo "Oracle Address: $ORACLE_ADDRESS"
echo "Game Address:   $GAME_ADDRESS"
echo "======================"
echo "VITE_CW721_CONTRACT_ADDRESS=$CW721_ADDRESS"
echo "VITE_ORACLE_ADDRESS=$ORACLE_ADDRESS"
echo "VITE_GAME_CONTROLLER_ADDRESS=$GAME_ADDRESS"