use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};
use spore_fates::game::GlobalBiomass;

use crate::msg::TraitTarget;

#[cw_serde]
pub struct GameConfig {
    pub payment_denom: String,
    pub spin_cost: Uint128,
    pub mint_cost: Uint128,
    pub mint_cost_increment: Uint128,
    pub cw721_addr: Addr,
    pub oracle_addr: Addr,
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

#[cw_serde]
#[derive(Default)]
pub struct GameStats {
    pub total_minted: u64,
    pub total_burned: u64,
    pub total_spins: u64,
    pub total_rewards_distributed: Uint128,
    pub total_mint_volume: Uint128,
    pub total_spin_volume: Uint128,
    pub total_rewards_recycled: Uint128,
    pub total_harvests: u64,
    pub total_splices: u64,
    pub total_ascensions: u64,
}

#[cw_serde]
pub struct PendingSpin {
    pub token_id: String,
    pub player: Addr,
    pub target: TraitTarget,
    pub bid_amount: Uint128,
    pub target_round: u64,
}

#[cw_serde]
pub struct LeaderboardEntry {
    pub token_id: String,
    pub score: Uint128,
}

pub const GAME_STATS: Item<GameStats> = Item::new("game_stats");
pub const CONFIG: Item<GameConfig> = Item::new("config");
pub const GLOBAL_STATE: Item<GlobalState> = Item::new("global_state");
pub const TOKEN_INFO: Map<&str, TokenInfo> = Map::new("token_info");
pub const MINT_COUNTER: Item<u64> = Item::new("mint_counter");
pub const PENDING_SPINS: Map<&str, PendingSpin> = Map::new("pending_spins");
pub const BIOMASS: Item<GlobalBiomass> = Item::new("biomass");
pub const LEADERBOARD: Item<Vec<LeaderboardEntry>> = Item::new("leaderboard");

// Token locking to prevent concurrent operations
pub const LOCKED_TOKENS: Map<&str, String> = Map::new("locked_tokens"); // token_id -> reason

#[cw_serde]
pub struct PendingMint {
    pub player: Addr,
    pub payment_amount: Uint128,
    pub target_round: u64,
    pub mint_id: String,
}

pub const PENDING_MINTS: Map<&str, PendingMint> = Map::new("pending_mints");

#[cw_serde]
pub struct PendingSplice {
    pub player: Addr,
    pub parent_1_id: String,
    pub parent_2_id: String,
    pub target_round: u64,
    pub splice_id: String,
}

pub const PENDING_SPLICES: Map<&str, PendingSplice> = Map::new("pending_splices");

#[cw_serde]
pub struct PendingAscend {
    pub player: Addr,
    pub token_id: String,
    pub target_round: u64,
    pub burned_amount: Uint128,
}

pub const PENDING_ASCENDS: Map<&str, PendingAscend> = Map::new("pending_ascends");

// Per-player index: tracks which tokens each player owns.
// Eliminates the need for cross-contract CW721 Tokens queries in profile lookups.
#[cw_serde]
pub struct PlayerInfo {
    pub token_ids: Vec<String>,
}

pub const PLAYER_INFO: Map<&str, PlayerInfo> = Map::new("player_info");
