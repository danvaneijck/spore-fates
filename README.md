# SporeFates - Injective Mushroom NFT GameFi

A strategy GameFi dApp where users evolve "Mushroom NFTs" by rolling mutable traits and engineering genetic lineages on the Injective blockchain.

## Features

- **Dual Stat System**: Volatile Traits (-3 to +3) and Permanent Base Stats (0 to +10).
- **Genetics & Breeding**: Splicing system to merge genomes and mutate new strains.
- **Dynamic Ecosystem**: "The Canopy" algorithm adjusts yields based on global trait scarcity.
- **Mutable NFT Traits**: Cap, Stem, Spores, and Substrate (Prestige).
- **Pyth-Based Randomness**: Synchronous PRNG using Pyth price feeds + block data.
- **Prestige System**: Ascend to higher substrate levels for permanent multipliers.

## Architecture

### Smart Contracts (CosmWasm)

1. **cw721-spore**: NFT contract storing Volatile Traits, Substrate, and the 8-slot Genome.
2. **spore-game-controller**: Handles Spinning, Splicing (Breeding), Ecosystem math, and Reward distribution.

### Frontend (React + Injective SDK)

- Wallet connectivity (Keplr, Leap, Metamask)
- Real-time mushroom rendering and Genetic visualization
- "Weather" dashboard for tracking ecosystem yield multipliers

## Game Mechanics

### 1. Stats & Power
A Mushroom's total power determines its share of the reward pool.
$$ \text{Total Power} = \text{Volatile Stat} + \text{Base Stat} $$

*   **Volatile Stats:** Range from **-3 to +3**. Changed via "Spinning" (RNG Risk). Resets on Harvest.
*   **Base Stats:** Range from **0 to +10**. Determined by **Genetics**. Permanent and never reset.

### 2. Genetics & Splicing
Every Mushroom contains a genome of **8 Genes**. The count of specific genes determines the **Base Stat**.

**The Genes:**
*   🔴 **Toxin:** Boosts Base Cap.
*   🟢 **Chitin:** Boosts Base Stem.
*   🔵 **Phosphor:** Boosts Base Spores.
*   🟡 **Primordial:** Wildcard (Counts as all three).
*   ⚪ **Rot:** Null gene (No bonus).

**Thresholds:**
| Gene Count | Rank | Effect |
| :--- | :--- | :--- |
| 1-2 | Recessive | +0 Base Stat |
| 3-4 | Expressed | +1 Base Stat |
| 5-6 | Dominant | +3 Base Stat |
| 7 | Overlord | +6 Base Stat |
| 8 | Purebred | +10 Base Stat |

**Splicing (Breeding):**
*   **Cost:** Burn 2 Parent NFTs + Gas.
*   **Outcome:** 1 Child NFT.
*   **Inheritance:** 50/50 chance per slot to inherit from Parent A or B.
*   **Mutation:** 5% chance per slot to mutate into **Rot** (90% chance) or **Primordial** (10% chance).

### 3. The Canopy (Ecosystem Economy)
Yields are dynamic. The game targets a balanced ecosystem (33% Cap / 33% Stem / 33% Spores).

*   **Scarcity Multiplier:** Traits that are rare in the global pool earn **Higher Yields** (up to 5x).
*   **Oversaturation:** Traits that are too common earn **Lower Yields**.
*   **The Shadow Zone:** If a mushroom's efficiency score drops below **0.8** due to possessing too many oversaturated traits, it enters the Shadow Zone and earns **0 Rewards**. Players must Splice (burn) common mushrooms to restore balance.

### 4. Substrate Levels (Prestige)
Substrate applies a global multiplier to your shares and unlocks perks.

*   **Level 0 (Base):** 1x Multiplier.
*   **Level 1 (Regrowth):** 2x Multiplier. *Harvest Perk:* Random stat starts at +1.
*   **Level 2 (Rooted):** 3x Multiplier. *Spin Perk:* Protected from loss at +1.
*   **Level 3 (Hardened):** 4x Multiplier. *Trade-off:* Spin success rate drops to 45%.
*   **Level 4 (Mycelial Network):** 5x Multiplier. *Crit Perk:* 10% chance to gain +2 stats on spin win.

### 5. Spin System
- **Cost:** 1 SHROOM token.
- **Success Rate:** ~50% (decreases at Substrate Lvl 3+).
- **Apex Immunity:** If a mushroom has a **Base Stat of +10** (Tier 4), it is immune to spin penalties for that trait.
- **Trait Mutation Rules:**
  - **Win:** -1 → +1, others increment normally (Max +3).
  - **Loss:** +1 → -1 (Protected at Substrate Lvl 2+ or Base Stat 10), others decrement.

### 6. Ascend
- **Requirement:** All 3 **Volatile** traits must be exactly **+3**.
- **Cost:** Burns all pending rewards.
- **Success:** 20% chance to increase Substrate Level.
- **Effect:** Resets Volatile traits to 0. Base Stats are preserved.

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
VITE_MINT_COST=0
```

## Technology Stack

- **Blockchain**: Injective Protocol
- **Smart Contracts**: CosmWasm (Rust)
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Wallet**: Injective Wallet Strategy
- **Randomness**: Pyth Network Price Feeds + SHA256 Hashing

## Security Notes

- Randomness uses Pyth price feeds + block data (pseudo-randomness suitable for low-stakes).
- The "Shadow Zone" logic requires an initial bootstrap period; in testnet mode, the contract may disable this check if total biomass is low (<20).
- Splicing permanently burns NFTs; UI includes strict confirmation modals.

## License

MIT
