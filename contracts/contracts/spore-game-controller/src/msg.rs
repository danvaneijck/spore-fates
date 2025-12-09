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
}

#[cw_serde]
pub struct PendingRewardsResponse {
    pub pending_rewards: Uint128,
}

#[cw_serde]
pub struct EcosystemMetricsResponse {
    pub total_biomass: GlobalBiomass,
    pub cap_multiplier: Decimal,
    pub stem_multiplier: Decimal,
    pub spores_multiplier: Decimal,
}
