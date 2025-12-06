# SporeFates - Injective Mushroom NFT GameFi

A strategy GameFi dApp where users evolve "Mushroom NFTs" by rolling mutable traits on the Injective blockchain.

## Features

- **Mutable NFT Traits**: Cap, Stem, Spores (-3 to +3), and Substrate (0 to 4 prestige levels)
- **Pyth-Based Randomness**: Synchronous PRNG using Pyth price feeds + block data
- **Reward Distribution**: Share-based reward system with global pool
- **Prestige System**: Ascend to higher substrate levels for permanent bonuses
- **Beautiful UI**: React frontend with real-time mushroom visualization

## Architecture

### Smart Contracts (CosmWasm)

1. **cw721-spore**: NFT contract with mutable trait extensions
2. **spore-game-controller**: Game logic, randomness, and reward distribution

### Frontend (React + Injective SDK)

- Wallet connectivity (Keplr, Leap, Metamask)
- Real-time mushroom rendering
- Transaction broadcasting with visual feedback

## Game Mechanics

### Spin System
- Cost: 1 SHROOM token
- Success rate: 50% (55% at Substrate Level 3+)
- Trait mutation rules:
  - Win: -1 → +1, others increment
  - Loss: +1 → -1 (protected at Substrate Level 2+), others decrement
  - Substrate Level 4: 10% chance for +2 on win

### Harvest
- Claim pending rewards
- Reset traits to 0 (Substrate Level 1+ gives +1 to random trait)
- Recalculate reward shares

### Ascend (Prestige)
- Requires: All traits at +3
- Cost: Burn pending rewards
- Success: 20% chance to increase substrate level
- Always resets traits to 0

## Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Smart Contract Deployment

**Note: Building and deploying requires native Rust toolchain**

See `contracts/README.md` for detailed build and deployment instructions.

## Environment Variables

Copy `.env.example` to `.env` and update with your contract addresses:

```env
VITE_NETWORK=testnet
VITE_CHAIN_ID=injective-888
VITE_CW721_CONTRACT_ADDRESS=<your_nft_contract>
VITE_GAME_CONTROLLER_ADDRESS=<your_game_contract>
VITE_PYTH_CONTRACT_ADDRESS=<pyth_contract>
VITE_PRICE_FEED_ID=<price_feed_id>
VITE_PAYMENT_DENOM=factory/<creator>/shroom
VITE_SPIN_COST=1000000
```

## Technology Stack

- **Blockchain**: Injective Protocol
- **Smart Contracts**: CosmWasm (Rust)
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Wallet**: Injective Wallet Strategy
- **Randomness**: Pyth Network Price Feeds

## Security Notes

- Randomness uses Pyth price feeds + block data (not production-grade for high-value games)
- Consider implementing VRF (Verifiable Random Function) for production
- Audit smart contracts before mainnet deployment
- Implement rate limiting and anti-bot measures

## License

MIT
