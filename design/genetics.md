# SporeFates: Genetic Engineering & Mycelial Fusion

## 1. Overview
The SporeFates Genetics System introduces a deflationary, high-stakes progression layer to the game. While the standard **Spin** mechanic affects your *Volatile Stats* (-3 to +3), **Genetics** determine your *Base Stats* (Permanent +0 to +10).

Players must sacrifice (burn) two existing Mushrooms to breed a new, potentially superior strain. This process is called **Splicing**.

---

## 2. The Genome (8-Gene Structure)
Every Mushroom NFT contains a unique genetic sequence consisting of **8 Genes**, arranged in 4 Diploid Pairs.

**Visual Representation:**
`[Slot 1A, 1B] -- [Slot 2A, 2B] -- [Slot 3A, 3B] -- [Slot 4A, 4B]`

### The 4 Genetic Substances
There are four types of genes. The total count of specific genes within the 8 slots determines the mushroom's Base Stats.

| Gene Name | Color | Theme | Associated Trait |
| :--- | :--- | :--- | :--- |
| **Toxin** | 🔴 Red | Poison / Aggression | **Cap** |
| **Chitin** | 🟢 Green | Armor / Structure | **Stem** |
| **Phosphor** | 🔵 Blue | Energy / Spread | **Spores** |
| **Primordial** | 🟡 Gold | Ancient / Divine | **Wildcard** (Counts as all 3) |

---

## 3. Stat Architecture

A Mushroom's power is calculated by combining its volatile gameplay stats with its permanent genetic heritage.

$$ \text{Total Power} = \text{Volatile Stat} + \text{Base Stat} $$

*   **Volatile Stats:** Ranges from **-3 to +3**. Changed via "Spinning" (RNG Risk).
*   **Base Stats:** Ranges from **0 to +10**. Fixed at Mint/Splicing. **Safe from loss.**

### Genetic Thresholds
The **Base Stat** is determined by how many genes of a specific type exist in the genome (Primordial genes add to the count of ALL types).

| Gene Count (Sum of Specific Type + Primordial) | Classification | Bonus Effect (Base Stat) |
| :--- | :--- | :--- |
| **1 - 2** | Recessive | +0 |
| **3 - 4** | Expressed | **+1** |
| **5 - 6** | Dominant | **+3** |
| **7** | Overlord | **+6** |
| **8** | **Purebred** | **+10 (MAX)** |

*Example:* A Mushroom with **4 Toxin**, **3 Chitin**, and **1 Primordial**.
*   **Effective Toxin:** 4 + 1 = 5 $\rightarrow$ **Base Cap +3**
*   **Effective Chitin:** 3 + 1 = 4 $\rightarrow$ **Base Stem +1**
*   **Effective Phosphor:** 0 + 1 = 1 $\rightarrow$ **Base Spores +0**

---

## 4. The Splicing Ritual (Breeding)

**Mechanic:** "Compost two to grow one."
**Cost:** Gas + 2 NFTs Burned.
**Output:** 1 Child NFT.

### Inheritance Logic (Punnett Square)
When Splicing **Parent A** and **Parent B**, the contract iterates through all 8 slots. For each slot, there is a **50/50** chance to inherit the gene from either parent.

**Example Calculation (Slot 1A):**
*   Parent A has **Toxin**.
*   Parent B has **Phosphor**.
*   **RNG Roll:** 
    *   1-50: Child gets **Toxin**.
    *   51-100: Child gets **Phosphor**.

### Mutation (The Wildcard Factor)
During the inheritance roll, there is a small probability of a genetic error or miracle.

*   **Mutation Chance:** 5% per slot.
*   **Outcomes:**
    1.  **Ascension (10% of mutations):** Gene becomes **Primordial** (Gold).
    2.  **Degradation (90% of mutations):** Gene becomes **Rot** (Grey/Null gene).
        *   *Rot genes provide 0 bonuses and break chains. They must be bred out.*

---

## 5. The Tiers of Evolution

By manipulating genetics, players aim to create specialized or perfect mushrooms.

### Tier 1: The Sporeling (Common)
*   **Genetics:** Scattered mix (e.g., 2 Toxin, 3 Chitin, 2 Phosphor, 1 Rot).
*   **Stats:** Base Total +1 or +2.
*   **Role:** Fodder for composting.

### Tier 2: The Hybrid (Uncommon)
*   **Genetics:** Focused mix (e.g., 4 Toxin, 4 Chitin).
*   **Stats:** Base Cap +1, Base Stem +1.
*   **Role:** Reliable entry-level earner. Safer for spinning.

### Tier 3: The Specialist (Rare)
*   **Genetics:** Heavy concentration (e.g., 7 Toxin, 1 Other).
*   **Stats:** Base Cap +6.
*   **Role:** "Glass Cannon." Massive rewards for specific tasks, but weak in other areas.

### Tier 4: The Apex (Legendary)
*   **Genetics:** 8 of a Single Type (e.g., 8 Chitin).
*   **Stats:** Base Stem +10.
*   **Role:** The tank. Immune to most Spin penalties due to high base floor.

### Tier 5: The Ancient Sovereign (God)
*   **Genetics:** **8 Primordial Genes**.
*   **Probability:** Statistically near-impossible without months of strategic breeding.
*   **Stats:** **10 Cap / 10 Stem / 10 Spores**.
*   **Visuals:** Celestial/Gold aura.
*   **Utility:** Generates passive "Seeds" (Whitelists) for new players.

---

## 6. Economy & Strategy

### The "Market of Genes"
Because Splicing burns 2 NFTs to create 1, the supply of mushrooms is permanently deflationary.
*   **Bad Stats, Good Genes:** A mushroom with -3 Volatile Stats but **4 Toxin Genes** becomes extremely valuable as "Breeding Stock" for a player trying to create a Cap Specialist.

### The Rot Risk
The "Rot" mutation prevents infinite easy scaling. If you over-breed without being careful, you risk polluting your gene pool with Null genes, forcing you to burn that lineage or sell it cheap.

### Strategic Loops
1.  **Mint/Buy** cheap Sporelings.
2.  **Identify** recessive genes (e.g., looking for Toxin).
3.  **Splice** them together to concentrate the Toxin count.
4.  **Produce** a Specialist (7-8 Toxin).
5.  **Farm** rewards with high Base Stats, or **Sell** to competitive players.