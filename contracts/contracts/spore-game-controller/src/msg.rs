use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Decimal, Uint128, Uint64};
use spore_fates::game::GlobalBiomass;

use crate::state::LeaderboardEntry;

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
    RequestAscend {
        token_id: String,
    },
    ResolveAscend {
        token_id: String,
    },
    RequestMint {},
    ResolveMint {
        mint_id: String,
    },
    Recycle {
        token_id: String,
    },
    RequestSplice {
        parent_1_id: String,
        parent_2_id: String,
    },
    ResolveSplice {
        splice_id: String,
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
    },
    GetPendingSpin {
        token_id: String,
    },
    GetPendingMint {
        mint_id: String,
    },
    GetPendingSplice {
        splice_id: String,
    },
    GetPendingAscend {
        token_id: String,
    },
    GetLeaderboard {},
}

#[cw_serde]
pub struct LeaderboardResponse {
    pub entries: Vec<LeaderboardEntry>,
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
    pub total_mint_volume: Uint128,
    pub total_spin_volume: Uint128,
    pub total_rewards_recycled: Uint128,
    pub total_harvests: u64,
    pub total_splices: u64,
    pub total_ascensions: u64,
}

#[cw_serde]
pub struct MintPriceResponse {
    pub price: Uint128,
}

#[cw_serde]
pub struct PlayerProfileResponse {
    pub total_mushrooms: u64,
    pub total_shares: Uint128,
    pub total_pending_rewards: Uint128,
    pub best_mushroom_id: Option<String>,
}

#[cw_serde]
pub struct PendingSpinResponse {
    pub is_pending: bool,
    pub target_round: u64,
}

#[cw_serde]
pub struct PendingMintResponse {
    pub is_pending: bool,
    pub target_round: u64,
}

#[cw_serde]
pub struct PendingSpliceResponse {
    pub is_pending: bool,
    pub target_round: u64,
}

#[cw_serde]
pub struct PendingAscendResponse {
    pub is_pending: bool,
    pub target_round: u64,
}

#[cw_serde]
pub enum OracleQueryMsg {
    Beacon { round: Uint64 },
}

#[cw_serde]
pub struct BeaconResponse {
    pub uniform_seed: [u8; 32],
}
