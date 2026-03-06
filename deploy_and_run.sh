#!/bin/bash
set -euo pipefail

# ==============================================================================
# SPORE FATES - Build, Deploy & Run
# ==============================================================================
# Usage:
#   ./deploy_and_run.sh              # Build contracts, deploy, update .env, start frontend
#   ./deploy_and_run.sh --skip-build # Skip contract build (use existing artifacts)
#   ./deploy_and_run.sh --skip-deploy # Skip deploy (just start frontend with current .env)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/contracts"
ARTIFACTS_DIR="$CONTRACTS_DIR/artifacts"
ENV_FILE="$SCRIPT_DIR/.env"

# --- Flags ---
SKIP_BUILD=false
SKIP_DEPLOY=false
for arg in "$@"; do
    case $arg in
        --skip-build) SKIP_BUILD=true ;;
        --skip-deploy) SKIP_DEPLOY=true ;;
    esac
done

# ==============================================================================
# DEPLOY CONFIGURATION
# ==============================================================================

# Network Settings (Injective Testnet)
NODE="https://testnet.sentry.tm.injective.network:443"
CHAIN_ID="injective-888"
FEES="8000000000000000inj"
GAS="50000000"
KEY_NAME="testnet"
PASSWORD="12345678"

# Deployer address (must match KEY_NAME in injectived keyring)
DEPLOYER_ADDRESS="inj1q2m26a7jdzjyfdn545vqsude3zwwtfrdap5jgz"

# Game Configuration
PAYMENT_DENOM="inj"
SPIN_COST="10000000000000000"   # 0.01 INJ
MINT_COST="10000000000000000"   # 0.01 INJ (Base Price)
MINT_SLOPE="1000000000000000"   # 0.001 INJ (Increment per mint)

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

store_contract() {
    local wasm_file="$1"
    echo "  Storing: $(basename "$wasm_file")..." >&2

    local tx_output
    tx_output=$(yes "$PASSWORD" | injectived tx wasm store "$wasm_file" \
      --from="$KEY_NAME" \
      --chain-id="$CHAIN_ID" \
      --yes --fees="$FEES" --gas="$GAS" \
      --node="$NODE" 2>&1)

    if echo "$tx_output" | grep -q 'error:'; then
        echo "ERROR storing contract: $tx_output" >&2
        exit 1
    fi

    txhash=$(echo "$tx_output" | grep -o 'txhash: [A-F0-9]*' | awk '{print $2}')
    echo "  TX: $txhash" >&2
    sleep 6

    query_output=$(injectived query tx "$txhash" --node="$NODE")
    code_id=$(echo "$query_output" | grep -A 1 'key: code_id' | grep 'value:' | head -1 | sed 's/.*value: "\(.*\)".*/\1/')

    if [ -z "$code_id" ]; then
        echo "ERROR: Failed to retrieve code_id" >&2
        exit 1
    fi
    echo "$code_id"
}

instantiate_contract() {
    local code_id="$1"
    local init_msg="$2"
    local label="$3"
    local admin="$4"

    echo "  Instantiating: $label (Code ID: $code_id)..." >&2

    local tx_output
    tx_output=$(yes "$PASSWORD" | injectived tx wasm instantiate "$code_id" "$init_msg" \
      --label="$label" \
      --admin="$admin" \
      --from="$KEY_NAME" \
      --chain-id="$CHAIN_ID" \
      --yes --fees="$FEES" --gas="$GAS" \
      --node="$NODE" 2>&1)

    txhash=$(echo "$tx_output" | grep -o 'txhash: [A-F0-9]*' | awk '{print $2}')
    sleep 6
    query_output=$(injectived query tx "$txhash" --node="$NODE")
    contract_address=$(echo "$query_output" \
      | grep -A 1 'key: contract_address' \
      | grep 'value:' \
      | head -1 \
      | sed "s/.*value: //; s/['\"]//g")

    if [ -z "$contract_address" ]; then
        echo "ERROR: Failed to retrieve contract_address" >&2
        echo "TX output: $query_output" >&2
        exit 1
    fi
    echo "$contract_address"
}

execute_contract() {
    local contract_addr="$1"
    local exec_msg="$2"
    local action_name="$3"

    echo "  Executing: $action_name..." >&2

    tx_output=$(yes "$PASSWORD" | injectived tx wasm execute "$contract_addr" "$exec_msg" \
      --from="$KEY_NAME" \
      --chain-id="$CHAIN_ID" \
      --yes --fees="$FEES" --gas="$GAS" \
      --node="$NODE" 2>&1) || true

    if echo "$tx_output" | grep -q 'error:'; then
        echo "ERROR executing contract: $tx_output" >&2
        exit 1
    fi

    txhash=$(echo "$tx_output" | grep -o 'txhash: [A-F0-9]*' | awk '{print $2}')
    echo "  TX: $txhash" >&2
    sleep 2
}

# ==============================================================================
# STEP 1: BUILD CONTRACTS
# ==============================================================================

if [ "$SKIP_BUILD" = false ] && [ "$SKIP_DEPLOY" = false ]; then
    echo ""
    echo "=========================================="
    echo " STEP 1: Building optimized contracts"
    echo "=========================================="
    echo ""

    cd "$CONTRACTS_DIR"

    if ! docker info > /dev/null 2>&1; then
        echo "ERROR: Docker is not running. Start Docker or use --skip-build."
        exit 1
    fi

    docker run --rm -v "$(pwd)":/code \
      --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
      --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
      cosmwasm/workspace-optimizer:0.17.0

    echo ""
    echo "Artifacts:"
    for file in artifacts/*.wasm; do
        size=$(ls -lh "$file" | awk '{print $5}')
        echo "  $(basename "$file") ($size)"
    done
    echo ""
else
    if [ "$SKIP_DEPLOY" = false ]; then
        echo ""
        echo "[Skipping build - using existing artifacts]"
        echo ""
    fi
fi

# ==============================================================================
# STEP 2: DEPLOY CONTRACTS
# ==============================================================================

if [ "$SKIP_DEPLOY" = false ]; then
    echo ""
    echo "=========================================="
    echo " STEP 2: Deploying to $CHAIN_ID"
    echo "=========================================="
    echo ""

    # Verify artifacts exist
    for f in cw721_spore.wasm drand_oracle.wasm spore_game_controller.wasm; do
        if [ ! -f "$ARTIFACTS_DIR/$f" ]; then
            echo "ERROR: Missing artifact: $ARTIFACTS_DIR/$f"
            echo "Run without --skip-build to build first."
            exit 1
        fi
    done

    # --- Upload code ---
    echo "[1/5] Uploading contract code..."
    CW721_CODE_ID=$(store_contract "$ARTIFACTS_DIR/cw721_spore.wasm")
    echo "  CW721 Code ID: $CW721_CODE_ID"

    ORACLE_CODE_ID=$(store_contract "$ARTIFACTS_DIR/drand_oracle.wasm")
    echo "  Oracle Code ID: $ORACLE_CODE_ID"

    GAME_CODE_ID=$(store_contract "$ARTIFACTS_DIR/spore_game_controller.wasm")
    echo "  Game Code ID: $GAME_CODE_ID"
    echo ""

    # --- Instantiate CW721 ---
    echo "[2/5] Instantiating CW721..."
    INIT_CW721=$(jq -n --arg minter "$DEPLOYER_ADDRESS" '{
      name: "Spore Fates",
      symbol: "SPORE",
      minter: $minter
    }')
    CW721_ADDRESS=$(instantiate_contract "$CW721_CODE_ID" "$INIT_CW721" "spore-nft-v3" "$DEPLOYER_ADDRESS")
    echo "  CW721: $CW721_ADDRESS"
    echo ""

    # --- Instantiate Oracle ---
    echo "[3/5] Instantiating Drand Oracle..."
    ORACLE_ADDRESS=$(instantiate_contract "$ORACLE_CODE_ID" '{}' "spore-oracle-v3" "$DEPLOYER_ADDRESS")
    echo "  Oracle: $ORACLE_ADDRESS"
    echo ""

    # --- Instantiate Game Controller ---
    echo "[4/5] Instantiating Game Controller..."
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
    GAME_ADDRESS=$(instantiate_contract "$GAME_CODE_ID" "$INIT_GAME" "spore-game-v3" "$DEPLOYER_ADDRESS")
    echo "  Game: $GAME_ADDRESS"
    echo ""

    # --- Transfer CW721 Ownership ---
    echo "[5/5] Transferring CW721 ownership to Game Controller..."

    # Minter ownership
    PROPOSE_MSG=$(jq -n --arg new_owner "$GAME_ADDRESS" '{
      update_minter_ownership: {
        transfer_ownership: { new_owner: $new_owner, expiry: null }
      }
    }')
    execute_contract "$CW721_ADDRESS" "$PROPOSE_MSG" "Propose Minter Transfer"

    ACCEPT_MSG=$(jq -n --arg cw721 "$CW721_ADDRESS" '{
      accept_minter_ownership: { cw721_contract: $cw721 }
    }')
    execute_contract "$GAME_ADDRESS" "$ACCEPT_MSG" "Accept Minter Ownership"

    # Creator ownership
    PROPOSE_CREATOR_MSG=$(jq -n --arg new_owner "$GAME_ADDRESS" '{
      update_creator_ownership: {
        transfer_ownership: { new_owner: $new_owner, expiry: null }
      }
    }')
    execute_contract "$CW721_ADDRESS" "$PROPOSE_CREATOR_MSG" "Propose Creator Transfer"

    ACCEPT_CREATOR_MSG=$(jq -n --arg cw721 "$CW721_ADDRESS" '{
      accept_creator_ownership: { cw721_contract: $cw721 }
    }')
    execute_contract "$GAME_ADDRESS" "$ACCEPT_CREATOR_MSG" "Accept Creator Ownership"
    echo ""

    # ==============================================================================
    # STEP 3: WRITE .env
    # ==============================================================================

    echo "=========================================="
    echo " STEP 3: Writing .env"
    echo "=========================================="
    echo ""

    # Preserve DELEGATE_MNEMONIC and JWT_SECRET if they exist
    EXISTING_MNEMONIC=""
    EXISTING_DELEGATE_ADDR=""
    EXISTING_JWT=""
    if [ -f "$ENV_FILE" ]; then
        EXISTING_MNEMONIC=$(grep '^DELEGATE_MNEMONIC=' "$ENV_FILE" | cut -d= -f2- || true)
        EXISTING_DELEGATE_ADDR=$(grep '^VITE_DELEGATE_ADDRESS=' "$ENV_FILE" | cut -d= -f2- || true)
        EXISTING_JWT=$(grep '^JWT_SECRET=' "$ENV_FILE" | cut -d= -f2- || true)
    fi

    cat > "$ENV_FILE" <<EOF
VITE_NETWORK=testnet
VITE_CHAIN_ID=$CHAIN_ID

VITE_CW721_CONTRACT_ADDRESS=$CW721_ADDRESS
VITE_ORACLE_ADDRESS=$ORACLE_ADDRESS
VITE_GAME_CONTROLLER_ADDRESS=$GAME_ADDRESS

VITE_MINT_DENOM=$PAYMENT_DENOM
VITE_MINT_SYMBOL=INJ
VITE_MINT_DECIMALS=18
VITE_MINT_COST=0.01
VITE_SPIN_COST=0.01

DELEGATE_MNEMONIC=$EXISTING_MNEMONIC
VITE_DELEGATE_ADDRESS=$EXISTING_DELEGATE_ADDR

JWT_SECRET=${EXISTING_JWT:-123}
EOF

    echo "  Written to: $ENV_FILE"
    echo "  CW721:  $CW721_ADDRESS"
    echo "  Oracle: $ORACLE_ADDRESS"
    echo "  Game:   $GAME_ADDRESS"
    echo ""

else
    echo ""
    echo "[Skipping deploy - using existing .env]"
    echo ""

    if [ ! -f "$ENV_FILE" ]; then
        echo "ERROR: No .env file found. Run without --skip-deploy first."
        exit 1
    fi
fi

# ==============================================================================
# STEP 4: START FRONTEND
# ==============================================================================

echo "=========================================="
echo " STEP 4: Starting frontend dev server"
echo "=========================================="
echo ""

cd "$SCRIPT_DIR"

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    npm install
    echo ""
fi

echo "  Starting vite dev server..."
echo ""
npx vite
