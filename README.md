# SporeFates - Injective Mushroom NFT GameFi

A strategy GameFi dApp where users evolve "Mushroom NFTs" by rolling mutable traits on the Injective blockchain.

## Features

- **Mutable NFT Traits**: Cap, Stem, Spores (-3 to +3), and Substrate (0 to 4 prestige levels)
- **Pyth-Based Randomness**: Synchronous PRNG using Pyth price feeds + block data
- **Reward Distribution**: Share-based reward system with global pool
- **Prestige System**: Ascend to higher substrate levels for permanent multipliers and mechanics
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

### Substrate Levels (Buffs & Trade-offs)
Substrate determines your share of the global reward pool and unlocks specific gameplay mechanics.

*   **Level 0 (Base)**
    *   **Reward Share:** 1x Multiplier
    *   *Standard Rules apply.*

*   **Level 1 (Regrowth)**
    *   **Reward Share:** 2x Multiplier
    *   **Harvest Perk:** When harvesting, instead of resetting all stats to 0, one random stat will instantly start at **+1**.

*   **Level 2 (Rooted)**
    *   **Reward Share:** 3x Multiplier
    *   **Spin Perk:** You gain protection at +1. If you fail a spin while a stat is at +1, it stays at +1 (instead of dropping to -1).
    *   *Includes Level 1 Harvest Perk.*

*   **Level 3 (Hardened)**
    *   **Reward Share:** 4x Multiplier
    *   **Difficulty Spike:** Success rate for spins decreases from ~50% to ~45%. High risk, high reward.
    *   *Includes Level 1 & 2 Perks.*

*   **Level 4 (Mycelial Network)**
    *   **Reward Share:** 5x Multiplier
    *   **Crit Perk:** On a successful spin, there is a **10% chance** to gain +2 stats instantly (skipping a level).
    *   *Includes Level 1 & 2 Perks and Level 3 Difficulty.*

### Spin System
- **Cost:** 1 SHROOM token
- **Success Rate:**
  - Substrate 0-2: ~50% (Threshold 128/255)
  - Substrate 3-4: ~45% (Threshold 140/255)
- **Trait Mutation Rules:**
  - **Win:** -1 → +1, others increment normally (Max +3)
  - **Loss:** +1 → -1 (Protected at Substrate Lvl 2+), others decrement
  - **Crit:** Substrate Lvl 4 has a chance to jump +2 on a win

### Harvest
- Claims pending rewards (SHROOM).
- Resets all traits to 0 (unless Substrate Level ≥ 1, see above).
- Recalculates reward shares based on the reset traits.

### Ascend (Prestige)
- **Requirement:** All 3 traits (Cap, Stem, Spores) must be at **+3**.
- **Cost:** Burns all currently pending rewards.
- **Success:** 20% chance to increase Substrate Level.
- **Effect:** Always resets traits to 0, regardless of success.
- **Max Level:** Substrate cannot go higher than 4.

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

- Randomness uses Pyth price feeds + block data (pseudo-randomness suitable for low-stakes; consider VRF for high-value production environments).
- Audit smart contracts before mainnet deployment.
- Implement rate limiting and anti-bot measures.

## License

MIT