# SporeFates - Injective Mushroom NFT GameFi

A strategy GameFi dApp where users evolve "Mushroom NFTs" by rolling mutable traits and engineering genetic lineages on the Injective blockchain.

## Features

- **Dual Stat System**: Volatile Traits (-3 to +3) and Permanent Base Stats (0 to +10).
- **Supply-Elastic Economy**: Mint price adjusts dynamically based on the *active* supply (Minted minus Burned), creating a self-balancing market.
- **Genetics & Breeding**: Splicing system to merge genomes, inherit Substrate levels, and mutate new strains.
- **Dynamic Ecosystem**: "The Canopy" algorithm adjusts yields based on global trait scarcity.
- **Mutable NFT Traits**: Cap, Stem, Spores, and Substrate (Prestige).
- **On-Chain Leaderboard**: Real-time tracking of the Top 10 mushrooms by share power.
- **Drand-Based Randomness**: Verifiable, decentralized randomness for fair spin outcomes.
- **Prestige System**: Ascend to higher substrate levels or splice for the ultimate "Overmind" status.

## Architecture

### Smart Contracts (CosmWasm)

1. **cw721-spore**: NFT contract storing Volatile Traits, Substrate, and the 8-slot Genome. Includes SVG generation logic with dynamic visuals for high-level substrates.
2. **spore-game-controller**: Handles Spinning, Splicing (Breeding), Ecosystem math, Leaderboard sorting, and Reward distribution.

### Frontend (React + Injective SDK)

- Wallet connectivity (Keplr, Leap, Metamask)
- Real-time mushroom rendering and Genetic visualization
- "Weather" dashboard for tracking ecosystem yield multipliers
- Financial dashboard tracking Volume and Recycled Rewards

## Game Mechanics

### 1. Stats & Power (Quadratic Staking)
The game uses a **Quadratic Share** system to calculate rewards. Unlike traditional staking where $1 + 1 = 2$, here **Power is Squared**.

$$ \text{Total Power} = \text{Volatile Stats} + \text{Base Stats} $$
$$ \text{Reward Shares} = (\text{Total Power})^2 \times \text{Substrate Multiplier} $$

*   **The Impact:** A Mushroom with **20 Power** earns **400 Shares**. A Mushroom with **10 Power** earns **100 Shares**.
*   **Strategy:** One high-level mushroom earns significantly more than hoarding ten low-level ones. This forces vertical progression over horizontal expansion.

### 2. Genetics
Every Mushroom contains a genome of **8 Genes**. The count of specific genes determines the **Base Stat**.

**The Genes:**
*   🔴 **Toxin:** Boosts Base Cap.
*   🟢 **Chitin:** Boosts Base Stem.
*   🔵 **Phosphor:** Boosts Base Spores.
*   🟡 **Primordial:** Wildcard (Counts as all three). **Genetic Stability:** If a mushroom has **3+ Primordial Genes**, it is immune to stat loss on failed Spins.
*   ⚪ **Rot:** Null gene (No bonus).

**Thresholds:**
| Gene Count | Rank | Effect |
| :--- | :--- | :--- |
| 1-2 | Recessive | +0 Base Stat |
| 3-4 | Expressed | +1 Base Stat |
| 5-6 | Dominant | +3 Base Stat |
| 7 | Overlord | +6 Base Stat |
| 8 | Purebred | +10 Base Stat |

### 3. Splicing (Breeding) & Inheritance
Splicing burns 2 Parent NFTs to create 1 Child NFT. This is the primary deflationary mechanism.

*   **Gene Inheritance:** 50/50 chance per slot to inherit from Parent A or B.
*   **Substrate Inheritance:** The Child inherits the **Average** substrate level of the parents.
    *   *Synergy Bonus:* If parents have the same Substrate Level (>0), there is a **20% chance** the child upgrades to `Level + 1`.
*   **Genetic Decay:** High-level mushrooms are unstable. The chance of a gene mutating into **Rot** increases as the parents' Substrate Level increases.
    *   *Level 0 Parents:* ~5% Mutation Risk.
    *   *Level 4 Parents:* ~20% Mutation Risk (Requires introduction of fresh low-level genes to maintain purity).

### 4. The Canopy (Ecosystem Economy)
Yields are dynamic. The game targets a balanced ecosystem (33% Cap / 33% Stem / 33% Spores).

*   **Scarcity Multiplier:** Traits that are rare in the global pool earn **Higher Yields** (up to 5x).
*   **The Shadow Zone:** If a mushroom's efficiency score drops below **0.8** due to possessing too many oversaturated traits, it enters the Shadow Zone and earns **0 Rewards**.

### 5. Substrate Levels (Prestige)
Substrate applies a global multiplier to your shares and unlocks perks.

*   **Level 0 (Base):** 1x Multiplier.
*   **Level 1 (Regrowth):** 2x Multiplier. *Harvest Perk:* Random stat starts at +1.
*   **Level 2 (Rooted):** 3x Multiplier. *Spin Perk:* Protected from loss at +1.
*   **Level 3 (Hardened):** 4x Multiplier.
*   **Level 4 (Mycelial Network):** 5x Multiplier. *Crit Perk:* 10% chance to gain +2 stats on spin win.
*   **Level 5 (The Overmind):** 8x Multiplier. **Exclusive Status.**
    *   *How to obtain:* Cannot be obtained via Ascension. Can **only** be obtained by Splicing two Level 4 mushrooms together (Deflationary Black Hole).

### 6. Spin System
- **Cost:** 1 SHROOM token (Multiplied by Substrate Level).
- **Immunity Rules:**
  - **Apex Immunity:** Base Stat of +10 prevents loss on that specific stat.
  - **Primordial Stability:** 3+ Primordial Genes prevents loss on *all* stats.
- **Trait Mutation Rules:**
  - **Win:** -1 → +1, others increment normally (Max +3).
  - **Loss:** +1 → -1, others decrement (unless Immune).

### 7. Ascension
- **Requirement:** All 3 **Volatile** traits must be exactly **+3**.
- **Cost:** Burns all pending rewards.
- **Success:** 20% chance to increase Substrate Level (Max Level 4).
- **Effect:** Resets Volatile traits to 0. Base Stats are preserved.

## Economic Systems

### Bonding Curve Equilibrium
The mint price is not fixed. It follows a linear curve based on **Active Supply**.
$$ \text{Price} = \text{Base} + (\text{Increment} \times (\text{Total Minted} - \text{Total Burned})) $$

*   If players Splice (Burn) mushrooms to chase high stats, the supply drops, and the mint price decreases, incentivizing new players to enter.
*   If the ecosystem is crowded, the price increases.

### Recycled Rewards
When players are penalized (e.g., Harvesting in the Shadow Zone, Splicing parents with pending rewards, or Ascending), the forfeited tokens are **Recycled**. They are immediately distributed to all active stakers in the pool, increasing the global yield index.

## Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Environment Variables

Copy `.env.example` to `.env` and update with your contract addresses:

```env
VITE_NETWORK=testnet
VITE_CHAIN_ID=injective-888
VITE_CW721_CONTRACT_ADDRESS=<your_nft_contract>
VITE_GAME_CONTROLLER_ADDRESS=<your_game_contract>
VITE_ORACLE_CONTRACT_ADDRESS=<drand_oracle_contract>
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
- **Randomness**: Drand Beacon (Verifiable Random Function)

## License

MIT