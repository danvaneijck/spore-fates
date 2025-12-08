# Game Analytics & UI Data Architecture

## 1. Overview
To succeed in SporeFates, players need real-time data on the "Canopy" (Global Meta) to know which traits are currently profitable. The UI is divided into **Global Ecosystem**, **Player Performance**, and **ROI Intelligence**.

---

## 2. Global Ecosystem State (The "Weather" Report)
*This data helps players decide which traits to breed for.*

### On-Chain Metrics (Stored in `ECOSYSTEM_STATE`)
The contract tracks the live sums of all stats to calculate the Dynamic Reward Multipliers.

| Metric | Description | UI Visualization |
| :--- | :--- | :--- |
| **Total Biomass** | Sum of all Base Stats in game. | Large Counter (e.g., "1.2M Biomass") |
| **Gene Distribution** | % Split of Cap vs. Stem vs. Spores. | **Tri-Color Pie Chart** (Red/Green/Blue) |
| **Sunlight Multipliers** | Current reward value of each trait. | **Dynamic Tickers** (e.g., "Cap: 0.8x 🔻", "Stem: 1.5x 🟢") |
| **The Sun Line** | Avg Score required to earn rewards. | **Threshold Bar** showing "Safe Zone" vs "Shadow Zone". |
| **Deflation Rate** | Total NFTs Burned (Composted) vs Minted. | "Graveyard" Counter (e.g., "4,500 Shrooms Composted") |

### The "Weather" Widget
A simplified text summary for the dashboard header:
*   *Condition:* **"Overgrown Canopy"** (Too many Caps).
*   *Advisory:* **"High Demand for Stems. Breeding recommended."**

---

## 3. Player Dashboard (Mycelial Network)
*Personalized stats for the connected wallet.*

### Portfolio Overview
| Metric | Calculation | Purpose |
| :--- | :--- | :--- |
| **My Colony Size** | Count of owned NFTs. | Basic inventory. |
| **Total Power** | Sum of (Effective Canopy Score) of all NFTs. | "How strong am I?" |
| **Est. Daily Yield** | `(My Power / Global Power) * Daily Emission`. | "How much money am I making?" |
| **Active/Dormant** | Count of Shrooms Above/Below the Sun Line. | **Critical Warning:** "3 Shrooms are starving!" |

### Genetic Analysis (The Laboratory View)
A breakdown of the user's gene pool to assist with Breeding decisions.
*   **Gene Inventory:** "You own 14 Toxin, 2 Chitin, 8 Primordial genes."
*   **Potential Pairs:** "You have 2 pairs ready to Splice for a high-probability Stem upgrade."

---

## 4. ROI Intelligence (The Alpha)
*Calculated client-side using Contract Data + Oracle Price.*

### Power-to-Reward Ratio (PRR)
This helps players understand the efficiency of their assets.

$$ \text{PRR} = \frac{\text{Current Token Price} \times \text{Daily Yield}}{\text{Floor Price of NFT}} $$

*   **UI Display:** "Current APR: 140%" (Varies based on your Shroom's traits).

### The "Breeding Arbitrage" Indicator
This compares the cost of burning 2 floor NFTs vs the potential value of a specific Trait upgrade.
*   *Visual:* A scale showing **"Cheaper to Breed"** vs **"Cheaper to Buy"**.
*   *Logic:* If Stems are yielding 3x rewards, the implied value of a Stem Specialist rises. If the floor price is low, the indicator shouts **"BREED STEMS NOW"**.

---

## 5. Leaderboards (Competitive Tracking)
*Optional stats to drive social competition.*

1.  **The Sovereigns:** Top 10 Players by Total Yield Multiplier.
2.  **The Mad Scientists:** Top 10 Players by "Mutations Discovered" (RNG Luck).
3.  **The Reapers:** Top 10 Players by "Mushrooms Composted" (Burn Volume).

---

## 6. Technical Implementation (Query Structures)

### Smart Contract Response: `EcosystemResponse`
```rust
pub struct EcosystemResponse {
    pub total_supply: u64,
    pub burned_count: u64,
    // The raw sums
    pub total_cap_points: u128,
    pub total_stem_points: u128,
    pub total_spore_points: u128,
    // The calculated multipliers (Client can also calc this, but safer from contract)
    pub cap_multiplier: Decimal,
    pub stem_multiplier: Decimal,
    pub spore_multiplier: Decimal,
    // The cutoff score
    pub sun_line_threshold: u128, 
}
```

### Smart Contract Response: `PlayerSummaryResponse`
```rust
pub struct PlayerSummaryResponse {
    pub owned_count: u64,
    pub total_raw_stats: u128,      // Sum of stats
    pub total_effective_score: u128,// Sum of stats * current multipliers
    pub rank: Option<u64>,          // Optional (computationally heavy)
    pub starving_count: u64,        // How many below Sun Line
}
```

---

## 7. Visual Mockup Ideas

1.  **The Mushroom Card:**
    *   Instead of just showing "Cap: +5", show "Cap: +5 (**Effective: +3.2**)".
    *   If the Mushroom is in the "Shadow Zone", grey out the card and add a "Rotting" overlay effect.
    
2.  **The Splice Preview:**
    *   When selecting two parents, show a **Probability Bar**.
    *   "30% Chance of Toxin Specialist" | "5% Chance of Primordial" | "10% Chance of Rot".

3.  **The Sun Line Graph:**
    *   A line graph showing the "Sun Line" average over the last 30 days.
    *   Allows players to see if the game is getting harder (Avg score rising) so they know they need to upgrade to keep up.