use cosmwasm_schema::cw_serde;
use cosmwasm_std::Uint128;

#[cw_serde]
#[derive(Copy, Default)]
pub struct TraitExtension {
    pub cap: i8,
    pub stem: i8,
    pub spores: i8,
    pub substrate: u8,
}

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
    AcceptOwnership {
        cw721_contract: String,
    },
}

#[cw_serde]
pub enum QueryMsg {
    Config {},
    GlobalState {},
    TokenInfo { token_id: String },
    GetPendingRewards { token_id: String },
}

#[cw_serde]
pub struct PendingRewardsResponse {
    pub pending_rewards: Uint128,
}

// Message for calling CW721 contract
#[cw_serde]
pub enum Cw721ExecuteMsg {
    UpdateTraits {
        token_id: String,
        traits: TraitExtension,
    },
    Mint {
        token_id: String,
        owner: String,
        token_uri: Option<String>,
        extension: TraitExtension,
    },
}
