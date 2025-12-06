# SporeFates Smart Contracts

This directory contains the CosmWasm smart contracts for the SporeFates game.

## Contracts

### 1. cw721-spore (NFT Contract)
- Base: cw721-base
- Mutable traits: cap, stem, spores, substrate
- Only updatable by the game controller

### 2. spore-game-controller (Game Logic)
- Handles spin mechanics with Pyth-based randomness
- Manages reward distribution
- Controls trait mutations and prestige system

## Build Instructions

**Note: Building CosmWasm contracts requires native Rust toolchain and cannot run in WebContainer.**

### Prerequisites
```bash
rustup target add wasm32-unknown-unknown
cargo install cosmwasm-check
```

### Build
```bash
cd contracts/cw721-spore
cargo wasm
wasm-opt -Oz target/wasm32-unknown-unknown/release/cw721_spore.wasm -o cw721_spore_optimized.wasm

cd ../spore-game-controller
cargo wasm
wasm-opt -Oz target/wasm32-unknown-unknown/release/spore_game_controller.wasm -o spore_game_controller_optimized.wasm
```

### Deploy to Injective Testnet
```bash
# Store contracts
injectived tx wasm store cw721_spore_optimized.wasm \
  --from <key> \
  --gas auto \
  --gas-adjustment 1.3 \
  --node https://testnet.sentry.tm.injective.network:443 \
  --chain-id injective-888

injectived tx wasm store spore_game_controller_optimized.wasm \
  --from <key> \
  --gas auto \
  --gas-adjustment 1.3 \
  --node https://testnet.sentry.tm.injective.network:443 \
  --chain-id injective-888

# Instantiate CW721
injectived tx wasm instantiate <cw721_code_id> \
  '{"name":"SporeFates","symbol":"SPORE","minter":"<your_address>"}' \
  --label "sporefates-nft" \
  --from <key> \
  --no-admin \
  --gas auto \
  --gas-adjustment 1.3 \
  --node https://testnet.sentry.tm.injective.network:443 \
  --chain-id injective-888

# Instantiate Game Controller
injectived tx wasm instantiate <controller_code_id> \
  '{"payment_denom":"factory/<creator>/shroom","spin_cost":"1000000","pyth_contract_addr":"<pyth_addr>","price_feed_id":"<feed_id>","cw721_addr":"<nft_contract>"}' \
  --label "sporefates-controller" \
  --from <key> \
  --no-admin \
  --gas auto \
  --gas-adjustment 1.3 \
  --node https://testnet.sentry.tm.injective.network:443 \
  --chain-id injective-888
```
