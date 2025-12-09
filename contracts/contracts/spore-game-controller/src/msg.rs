use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Binary, Decimal, Uint128};
use spore_fates::game::GlobalBiomass;

#[cw_serde]
pub struct InstantiateMsg {
    pub payment_denom: String,
    pub spin_cost: Uint128,
    pub mint_cost: Uint128,
    pub mint_cost_increment: Uint128,
    pub oracle_addr: String, 
    pub cw721_addr: String,
}

#[cw_serde]
pub enum TraitTarget {
    Cap,
    Stem,
    Spores,
}

#[cw_serde]
pub enum ExecuteMsg {
    Spin {
        token_id: String,
        trait_target: TraitTarget,
    },
    ResolveSpin {
        token_id: String,
    },
    Harvest {
        token_id: String,
    },
    Ascend {
        token_id: String,
    },
    Mint {},
    Splice {
        parent_1_id: String,
        parent_2_id: String,
    },
    AcceptMinterOwnership {
        cw721_contract: String,
    },
    AcceptCreatorOwnership {
        cw721_contract: String,
    },
}

#[cw_serde]
pub enum QueryMsg {
    Config {},
    GlobalState {},
    GetEcosystemMetrics {},
    TokenInfo {
        token_id: String,
    },
    GetPendingRewards {
        token_id: String,
    },
    GetGameStats {},
    GetCurrentMintPrice {},
    GetPlayerProfile {
        address: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    GetPendingSpin { token_id: String },
}

#[cw_serde]
pub struct PendingRewardsResponse {
    pub accumulated_rewards: Uint128, // The "Raw" amount (Hidden/Potential)
    pub canopy_multiplier: Decimal,   // The current weather (0.0 to 5.0)
    pub estimated_payout: Uint128,    // What you get if you harvest NOW
}

#[cw_serde]
pub struct EcosystemMetricsResponse {
    pub total_biomass: GlobalBiomass,
    pub cap_multiplier: Decimal,
    pub stem_multiplier: Decimal,
    pub spores_multiplier: Decimal,
}

#[cw_serde]
pub struct GameStatsResponse {
    pub total_minted: u64,
    pub total_burned: u64,
    pub current_supply: u64,
    pub total_spins: u64,
    pub total_rewards_distributed: Uint128,
    pub total_biomass: GlobalBiomass,
}

#[cw_serde]
pub struct MintPriceResponse {
    pub price: Uint128,
}

#[cw_serde]
pub struct PlayerProfileResponse {
    pub total_mushrooms: u64,
    pub total_shares: Uint128,
    pub total_pending_rewards: Uint128,   // Calculated dynamically
    pub best_mushroom_id: Option<String>, // The ID of their highest share mushroom
    pub last_scanned_id: Option<String>,
}

#[cw_serde]
pub struct PendingSpinResponse {
    pub is_pending: bool,
    pub target_round: u64,
}

#[cw_serde]
pub enum OracleQueryMsg {
    GetRandomness { round: u64 },
}

#[cw_serde]
pub struct RandomnessResponse {
    pub randomness: Binary,
}