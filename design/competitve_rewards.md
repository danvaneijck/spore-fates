# The Canopy: Ecosystem Equilibrium & Competitive Rewards

## 1. Overview
**The Canopy** is the competitive reward layer of SporeFates. It ensures that the ecosystem remains diverse and creates a circular game loop where the "Meta" constantly shifts.

Unlike traditional staking where `More Stats = More Money`, SporeFates uses a **Scarcity-Based Scoring System**. 

*   **Oversaturated traits yield diminishing returns.**
*   **Rare traits yield compounded bonuses.**
*   **The bottom % of mushrooms starve in the "Shadow Zone."**

---

## 2. Global State Tracking
The Smart Contract tracks the sum of all **Base Stats** (Genetic Stats) currently staked/active in the game.

```rust
struct EcosystemState {
    total_base_cap: u128,   // Sum of all active Cap points
    total_base_stem: u128,  // Sum of all active Stem points
    total_base_spores: u128,// Sum of all active Spore points
    total_biomass: u128     // Sum of all three combined
}
```

---

## 3. The "Sunlight" Algorithm (Dynamic Yield)

To determine a mushroom's share of the rewards, we first calculate its **Effective Canopy Score**. This score adjusts the raw stats based on how rare they are in the current ecosystem.

### Step A: Calculate Scarcity Multipliers
The game targets a perfect equilibrium where Biomass is split 33% / 33% / 33% among the three traits.

$$ Multiplier_{trait} = \frac{\text{Target \%}}{\text{Actual \%}} $$

*   **If Caps are 50% of the ecosystem (Oversaturated):**
    $$ M_{cap} = \frac{33}{50} = 0.66x $$ (Cap points are worth less)
*   **If Stems are 10% of the ecosystem (Endangered):**
    $$ M_{stem} = \frac{33}{10} = 3.3x $$ (Stem points are worth triple)

### Step B: Calculate Individual Score
Your mushroom's raw genetic power is filtered through these multipliers.

$$ Score = (BaseCap \times M_{cap}) + (BaseStem \times M_{stem}) + (BaseSpores \times M_{spores}) $$

---

## 4. The Shadow Zone (The Cutoff)
Nature is cruel. Only the mushrooms tall enough to reach the sunlight survive.

The contract calculates a **Global Average Canopy Score** every epoch (e.g., every 24 hours or dynamically).

1.  **The Sun Line:** This is the precise average score of all active mushrooms.
2.  **The Shadow Zone:** Defined as **80% of the Sun Line**.

### Rules of the Shadow:
*   **Above the Line:** You earn rewards proportional to your Score.
*   **In the Shadow (Score < 80% of Avg):** You earn **0 Rewards**.
    *   *Narrative:* Your mushroom is choked out by the larger fungi. It is dormant.

### The Player's Choice:
If you find yourself in the Shadow Zone, you have two choices:
1.  **Spin:** Risk your Volatile Stats to try and pump your numbers temporarily.
2.  **Splice (Burn):** Burn this weak mushroom with another to breed a genetically superior child that can reach the Canopy.

---

## 5. Strategic Implications

### Scenario: The "Toxin" Rush
1.  Players realize Toxin (Cap) genes are cool. Everyone breeds Cap Specialists.
2.  **Global Cap Supply skyrockets.**
3.  $M_{cap}$ drops to 0.4x.
4.  Suddenly, "God Tier" Cap mushrooms are earning less than mediocre Stem mushrooms.
5.  **The Pivot:** Players realize they need Chitin (Stem) to earn high yield.
6.  Players start burning their Cap mushrooms to breed hybrids or search for Stem genes.
7.  **Equilibrium:** Cap supply drops, $M_{cap}$ recovers. The cycle repeats.

### The "Contrarian" Strategy
Smart players will look at the Global State (visualized in the UI) and specifically breed for the **lowest supply stat**.
*   *UI Indicator:* "Current Weather: High Winds (Stem Bonus active)"

---

## 6. Synergy with Genetics

This system creates a permanent sink for NFTs (Burning) because **genetic diversity is required for profit**.

*   If the game was just "Highest Stat Wins," everyone would eventually get a maxed mushroom and stop burning.
*   With **The Canopy**, a Maxed Cap Mushroom might become "Trash" next month if the server is flooded with Caps.
*   This forces the player to maintain a **Stable of Mushrooms** (one of each type) or constantly trade and breed to adapt to the changing ecosystem.