use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Decimal, Uint128};
use spore_fates::game::GlobalBiomass;

#[cw_serde]
pub struct InstantiateMsg {
    pub payment_denom: String,
    pub spin_cost: Uint128,
    pub mint_cost: Uint128,
    pub pyth_contract_addr: String,
    pub price_feed_id: String,
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
    TokenInfo { token_id: String },
    GetPendingRewards { token_id: String },
    GetGameStats {},
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
