use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};
use spore_fates::game::GlobalBiomass;

#[cw_serde]
pub struct GameConfig {
    pub payment_denom: String,
    pub spin_cost: Uint128,
    pub mint_cost: Uint128,
    pub pyth_contract_addr: Addr,
    pub price_feed_id: String,
    pub cw721_addr: Addr,
}

#[cw_serde]
pub struct GlobalState {
    pub total_shares: Uint128,
    pub global_reward_index: Uint128,
    pub spin_nonce: u64,
}

#[cw_serde]
pub struct TokenInfo {
    pub current_shares: Uint128,
    pub reward_debt: Uint128,
    pub pending_rewards: Uint128,
}

pub const CONFIG: Item<GameConfig> = Item::new("config");
pub const GLOBAL_STATE: Item<GlobalState> = Item::new("global_state");
pub const TOKEN_INFO: Map<&str, TokenInfo> = Map::new("token_info");
pub const MINT_COUNTER: Item<u64> = Item::new("mint_counter");

pub const BIOMASS: Item<GlobalBiomass> = Item::new("biomass");
