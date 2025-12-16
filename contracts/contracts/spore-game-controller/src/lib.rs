use std::str::FromStr;

use cosmwasm_schema::cw_serde;
use cosmwasm_std::{
    entry_point, to_json_binary, Addr, BankMsg, Binary, Coin, Decimal, Deps, DepsMut, Empty, Env,
    MessageInfo, Response, StdResult, Uint128, Uint64, WasmMsg,
};
use cw2::set_contract_version;
use cw721::msg::NftExtensionMsg;
use sha2::{Digest, Sha256};
use spore_fates::cw721::TraitExtension;
use spore_fates::game::GlobalBiomass;

pub mod error;
pub mod msg;
pub mod state;

use crate::error::ContractError;
use crate::msg::{
    BeaconResponse, EcosystemMetricsResponse, ExecuteMsg, GameStatsResponse, InstantiateMsg,
    LeaderboardResponse, MintPriceResponse, OracleQueryMsg, PendingRewardsResponse,
    PendingSpinResponse, PlayerProfileResponse, QueryMsg, TraitTarget,
};
use crate::state::{
    GameConfig, GameStats, GlobalState, LeaderboardEntry, PendingSpin, TokenInfo, BIOMASS, CONFIG,
    GAME_STATS, GLOBAL_STATE, LEADERBOARD, MINT_COUNTER, PENDING_SPINS, TOKEN_INFO,
};

const CONTRACT_NAME: &str = "crates.io:spore-game-controller";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

const DRAND_GENESIS: u64 = 1692803367;
const DRAND_PERIOD: u64 = 3;

fn parse_traits(extension: NftExtensionMsg) -> TraitExtension {
    let attributes = extension.attributes.unwrap_or_default();

    // Helper for numeric fields
    let get_val = |key: &str| -> String {
        attributes
            .iter()
            .find(|t| t.trait_type == key)
            .map(|t| t.value.clone())
            .unwrap_or("0".to_string())
    };

    // Helper for the genome string
    let get_str = |key: &str| -> String {
        attributes
            .iter()
            .find(|t| t.trait_type == key)
            .map(|t| t.value.clone())
            .unwrap_or("[]".to_string())
    };

    // Parse Genes: "[1, 0, 4...]" -> Vec<u8>
    let gene_string = get_str("genome");
    let trimmed = gene_string.trim_matches(|c| c == '[' || c == ']');

    let genes: Vec<u8> = if trimmed.is_empty() {
        // If empty or just "[]", return empty vec (or default 8 zeros if you prefer)
        vec![0; 8]
    } else {
        trimmed
            .split(',')
            .map(|s| s.trim().parse::<u8>().unwrap_or(0))
            .collect()
    };

    TraitExtension {
        // Volatile Stats
        cap: get_val("cap").parse().unwrap_or(0),
        stem: get_val("stem").parse().unwrap_or(0),
        spores: get_val("spores").parse().unwrap_or(0),
        substrate: get_val("substrate").parse().unwrap_or(0),

        // Genetics
        genes,
        base_cap: get_val("base_cap").parse().unwrap_or(0),
        base_stem: get_val("base_stem").parse().unwrap_or(0),
        base_spores: get_val("base_spores").parse().unwrap_or(0),
    }
}

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    MINT_COUNTER.save(deps.storage, &1u64)?;

    let config = GameConfig {
        payment_denom: msg.payment_denom,
        spin_cost: msg.spin_cost,
        mint_cost: msg.mint_cost,
        mint_cost_increment: msg.mint_cost_increment,
        oracle_addr: deps.api.addr_validate(&msg.oracle_addr)?,
        cw721_addr: deps.api.addr_validate(&msg.cw721_addr)?,
    };

    let global_state = GlobalState {
        total_shares: Uint128::zero(),
        global_reward_index: Uint128::zero(),
        spin_nonce: 0u64,
    };

    let biomass = GlobalBiomass {
        total_base_cap: 0,
        total_base_stem: 0,
        total_base_spores: 0,
    };

    let stats = GameStats::default();

    GAME_STATS.save(deps.storage, &stats)?;
    CONFIG.save(deps.storage, &config)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    BIOMASS.save(deps.storage, &biomass)?;
    LEADERBOARD.save(deps.storage, &vec![])?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("payment_denom", config.payment_denom))
}

#[cw_serde]
pub enum Cw721OwnableMsg {
    UpdateMinterOwnership(cw_ownable::Action),
    UpdateCreatorOwnership(cw_ownable::Action),
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Spin {
            token_id,
            trait_target,
        } => execute_spin(deps, env, info, token_id, trait_target),
        ExecuteMsg::ResolveSpin { token_id } => execute_resolve_spin(deps, env, info, token_id),
        ExecuteMsg::Harvest { token_id } => execute_harvest(deps, env, info, token_id),
        ExecuteMsg::Ascend { token_id } => execute_ascend(deps, env, info, token_id),
        ExecuteMsg::Mint {} => execute_mint(deps, env, info),
        ExecuteMsg::Recycle { token_id } => execute_recycle(deps, env, info, token_id),

        ExecuteMsg::Splice {
            parent_1_id,
            parent_2_id,
        } => execute_splice(deps, env, info, parent_1_id, parent_2_id),
        ExecuteMsg::AcceptMinterOwnership { cw721_contract } => {
            let inner_msg =
                Cw721OwnableMsg::UpdateMinterOwnership(cw_ownable::Action::AcceptOwnership);
            let accept_msg = to_json_binary(&inner_msg)?;

            let wasm_msg = WasmMsg::Execute {
                contract_addr: cw721_contract,
                msg: accept_msg,
                funds: vec![],
            };

            Ok(Response::new()
                .add_message(wasm_msg)
                .add_attribute("action", "accept_minter_ownership_proxy"))
        }
        ExecuteMsg::AcceptCreatorOwnership { cw721_contract } => {
            let inner_msg =
                Cw721OwnableMsg::UpdateCreatorOwnership(cw_ownable::Action::AcceptOwnership);
            let accept_msg = to_json_binary(&inner_msg)?;

            let wasm_msg = WasmMsg::Execute {
                contract_addr: cw721_contract,
                msg: accept_msg,
                funds: vec![],
            };

            Ok(Response::new()
                .add_message(wasm_msg)
                .add_attribute("action", "accept_creator_ownership_proxy"))
        }
    }
}

fn get_randomness(env: &Env, _deps: &DepsMut, nonce: u64) -> Result<u8, ContractError> {
    let mut hasher = Sha256::new();
    hasher.update(env.block.time.nanos().to_le_bytes());
    hasher.update(env.block.height.to_le_bytes());
    hasher.update(nonce.to_le_bytes());
    let result = hasher.finalize();
    Ok(result[0])
}

fn execute_mint(mut deps: DepsMut, env: Env, info: MessageInfo) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let mut stats = GAME_STATS.load(deps.storage)?; // Load stats to get total_minted count

    // 1. Calculate Bonding Curve Price
    let current_supply = stats.total_minted.saturating_sub(stats.total_burned);
    // Price = Base + (CurrentSupply * Increment)
    let increment_total = config.mint_cost_increment * Uint128::from(current_supply);
    let current_price = config.mint_cost + increment_total;

    // 2. Validate Payment
    if current_price > Uint128::zero() {
        let payment = info
            .funds
            .iter()
            .find(|coin| coin.denom == config.payment_denom)
            .ok_or(ContractError::InvalidPayment {})?;

        if payment.amount < current_price {
            return Err(ContractError::InsufficientFunds {});
        }
    }

    // 3. ID Logic
    let current_id_num = MINT_COUNTER.load(deps.storage)?;
    let next_id_num = current_id_num + 1;
    MINT_COUNTER.save(deps.storage, &next_id_num)?;
    let token_id = current_id_num.to_string();

    // 4. Load Global State
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;

    // 5. Generate Genetics
    let seed_byte = get_randomness(&env, &deps, global_state.spin_nonce)?;
    global_state.spin_nonce += 1;

    let mut hasher = Sha256::new();
    hasher.update([seed_byte]);
    hasher.update(env.block.time.nanos().to_be_bytes());
    hasher.update(token_id.as_bytes());
    let hash = hasher.finalize();

    let mut new_genes: Vec<u8> = Vec::with_capacity(8);
    for i in 0..8 {
        let random_byte = hash[i];
        let gene = random_byte % 4; // 0-3 (No Primordial for standard mint)
        new_genes.push(gene);
    }

    let mut new_traits = TraitExtension {
        cap: 0,
        stem: 0,
        spores: 0,
        substrate: 0,
        genes: new_genes,
        base_cap: 0,
        base_stem: 0,
        base_spores: 0,
    };
    new_traits.recalculate_base_stats();

    // 6. Calculate Shares & Distribute Rewards
    let initial_shares = calculate_shares(&new_traits);

    // DISTRIBUTE THE MINT COST TO EXISTING HOLDERS
    if !global_state.total_shares.is_zero() && current_price > Uint128::zero() {
        let reward_per_share = current_price.checked_div(global_state.total_shares)?;
        global_state.global_reward_index = global_state
            .global_reward_index
            .checked_add(reward_per_share)?;
    }

    // Update Biomass
    let mut biomass = BIOMASS.load(deps.storage)?;
    add_stats_to_globals(&mut biomass, &mut global_state, &new_traits);

    BIOMASS.save(deps.storage, &biomass)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;

    // 7. Save Token Info
    // Note: The new token starts with debt equal to the NEW index (after mint cost distribution)
    // This means the minter does NOT get a cut of their own mint cost.
    let token_info = TokenInfo {
        current_shares: initial_shares,
        reward_debt: initial_shares.checked_mul(global_state.global_reward_index)?,
        pending_rewards: Uint128::zero(),
    };
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;

    update_leaderboard(&mut deps, token_id.clone(), initial_shares)?;

    // 8. Execute Mint via CW721
    let mint_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&spore_fates::cw721::ExecuteMsg::Mint {
            token_id: token_id.clone(),
            owner: info.sender.to_string(),
            token_uri: None,
            extension: new_traits,
        })?,
        funds: vec![],
    };

    // Update Stats
    stats.total_minted += 1;
    stats.total_mint_volume += current_price;
    GAME_STATS.save(deps.storage, &stats)?;

    Ok(Response::new()
        .add_message(mint_msg)
        .add_attribute("action", "mint")
        .add_attribute("token_id", token_id)
        .add_attribute("price_paid", current_price)
        .add_attribute("owner", info.sender))
}

fn calculate_shares(traits: &TraitExtension) -> Uint128 {
    // 1. Calculate Raw Power
    let cap_score = (traits.cap as i128) + (traits.base_cap as i128);
    let stem_score = (traits.stem as i128) + (traits.base_stem as i128);
    let spores_score = (traits.spores as i128) + (traits.base_spores as i128);
    let raw_power = (cap_score + stem_score + spores_score).max(1);

    // 2. Quadratic Curve
    let quadratic_shares = raw_power.pow(2) as u128;

    // 3. Substrate Multiplier
    let multiplier = match traits.substrate {
        0..=4 => 1 + (traits.substrate as u128), // 1x, 2x, 3x, 4x, 5x
        _ => 8,                                  // Level 5 is 8x
    };

    Uint128::from(quadratic_shares * multiplier)
}

fn execute_spin(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
    trait_target: TraitTarget,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // 0. Check if already pending (Prevent double-spending)
    if PENDING_SPINS.has(deps.storage, &token_id) {
        return Err(ContractError::HasPendingSpin {});
    }

    // 1. Verify Ownership & Traits (For dynamic pricing)
    let nft_info: cw721::msg::NftInfoResponse<NftExtensionMsg> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::NftInfo {
            token_id: token_id.clone(),
        },
    )?;

    // Check sender is owner (Standard verification)
    let owner_res: cw721::msg::OwnerOfResponse = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::OwnerOf {
            token_id: token_id.clone(),
            include_expired: None,
        },
    )?;
    if owner_res.owner != info.sender.to_string() {
        return Err(ContractError::Unauthorized {});
    }

    let traits = parse_traits(nft_info.extension);

    // 2. Calculate Cost
    let cost_multiplier: u128 = match traits.substrate {
        0 => 1,
        1 => 2,
        2 => 3,
        3 => 5,
        4 => 10,
        _ => 20, // Level 5 costs 20x to spin (High Risk/Reward)
    };
    let required_payment = config
        .spin_cost
        .checked_mul(Uint128::from(cost_multiplier))?;

    // 3. Take Payment
    let payment = info
        .funds
        .iter()
        .find(|c| c.denom == config.payment_denom)
        .ok_or(ContractError::InvalidPayment {})?;
    if payment.amount < required_payment {
        return Err(ContractError::InsufficientFunds {});
    }

    // 4. Calculate Target Round (Current + 1)
    let now = env.block.time.seconds();
    let current_round = (now - DRAND_GENESIS) / DRAND_PERIOD;
    let target_round = current_round + 1;

    // 5. Save Pending State
    let pending = PendingSpin {
        token_id: token_id.clone(),
        player: info.sender,
        target: trait_target,
        bid_amount: required_payment,
        target_round,
    };
    PENDING_SPINS.save(deps.storage, &token_id, &pending)?;

    let mut stats = GAME_STATS.load(deps.storage)?;
    stats.total_spin_volume += required_payment;
    GAME_STATS.save(deps.storage, &stats)?;

    // We do NOT distribute rewards yet. We hold the funds in the contract until resolution.
    // If we distributed now, and the spin failed/timeout, we couldn't refund easily.

    Ok(Response::new()
        .add_attribute("action", "request_spin")
        .add_attribute("token_id", token_id)
        .add_attribute("target_round", target_round.to_string()))
}

fn execute_resolve_spin(
    mut deps: DepsMut,
    _env: Env,
    _info: MessageInfo, // Anyone can call this (Public Keeper)
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let pending = PENDING_SPINS
        .load(deps.storage, &token_id)
        .map_err(|_| ContractError::NoPendingSpin {})?;

    // 1. Fetch Randomness from Oracle
    let oracle_res: BeaconResponse = deps.querier.query_wasm_smart(
        config.oracle_addr.to_string(),
        &OracleQueryMsg::Beacon {
            round: Uint64::from(pending.target_round),
        },
    )?;

    // 2. Generate Deterministic Result
    // We mix randomness + token_id to ensure unique outcomes if multiple people spin on same round
    let mut hasher = Sha256::new();
    hasher.update(oracle_res.uniform_seed); // Use uniform_seed from response
    hasher.update(token_id.as_bytes());
    let result_hash = hasher.finalize();
    let random_value = result_hash[0]; // 0-255

    // 3. Load Data needed for Game Logic
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;
    let mut token_info = TOKEN_INFO.may_load(deps.storage, &token_id)?.unwrap(); // Should exist

    let nft_info: cw721::msg::NftInfoResponse<NftExtensionMsg> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::NftInfo {
            token_id: token_id.clone(),
        },
    )?;
    let mut traits = parse_traits(nft_info.extension);

    // A. Update Pending Rewards (Accumulate)
    if !token_info.current_shares.is_zero() && !global_state.total_shares.is_zero() {
        let accrued = token_info
            .current_shares
            .checked_mul(global_state.global_reward_index)?
            .checked_sub(token_info.reward_debt)?;
        token_info.pending_rewards += accrued;
    }

    // B. Determine Win/Loss
    let success_threshold = if traits.substrate >= 3 { 140u8 } else { 128u8 };
    let is_success = random_value >= success_threshold;

    let (current_val, current_base) = match pending.target {
        TraitTarget::Cap => (traits.cap, traits.base_cap),
        TraitTarget::Stem => (traits.stem, traits.base_stem),
        TraitTarget::Spores => (traits.spores, traits.base_spores),
    };

    let new_val = if is_success {
        if traits.substrate >= 4 && random_value % 10 == 0 {
            (current_val + 2).min(3)
        } else if current_val == -1 {
            1
        } else {
            (current_val + 1).min(3)
        }
    } else {
        // Protection Logic
        let primordial_count = count_primordial(&traits.genes);
        let has_stability = primordial_count >= 3;

        // Protection Logic
        if has_stability {
            // Do nothing on failure (Stable)
            current_val
        }
        // Existing protections (Base 10 or Substrate 2)
        else if current_base >= 10 || (current_val == 1 && traits.substrate >= 2) {
            current_val
        } else if current_val == 1 {
            -1
        } else {
            (current_val - 1).max(-3)
        }
    };

    // Apply
    match pending.target {
        TraitTarget::Cap => traits.cap = new_val,
        TraitTarget::Stem => traits.stem = new_val,
        TraitTarget::Spores => traits.spores = new_val,
    }

    // C. Update Shares & Globals
    let new_shares = calculate_shares(&traits);
    global_state.total_shares = global_state
        .total_shares
        .checked_sub(token_info.current_shares)?
        .checked_add(new_shares)?;

    // D. Distribute the Payment NOW
    let old_index = global_state.global_reward_index;

    if !global_state.total_shares.is_zero() {
        let reward_per_share = pending.bid_amount.checked_div(global_state.total_shares)?;
        global_state.global_reward_index += reward_per_share;
    }

    // Calculate how much the index went up due to this spin
    let index_increase = global_state.global_reward_index.checked_sub(old_index)?;

    // If the user has shares (post-spin), give them their slice of their own bid
    if !new_shares.is_zero() {
        let self_reward = new_shares.checked_mul(index_increase)?;
        token_info.pending_rewards = token_info.pending_rewards.checked_add(self_reward)?;
    }

    // E. Update User's Debt
    token_info.current_shares = new_shares;
    token_info.reward_debt = new_shares.checked_mul(global_state.global_reward_index)?;

    // 5. Save Everything
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;

    update_leaderboard(&mut deps, token_id.clone(), new_shares)?;

    // Increment Stats
    let mut stats = GAME_STATS.load(deps.storage)?;
    stats.total_spins += 1;
    GAME_STATS.save(deps.storage, &stats)?;

    // 6. Cleanup
    PENDING_SPINS.remove(deps.storage, &token_id);

    // 7. Update CW721
    let update_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&spore_fates::cw721::ExecuteMsg::UpdateTraits {
            token_id: token_id.clone(),
            traits,
        })?,
        funds: vec![],
    };

    let target_str = match pending.target {
        TraitTarget::Cap => "cap",
        TraitTarget::Stem => "stem",
        TraitTarget::Spores => "spores",
    };

    Ok(Response::new()
        .add_message(update_msg)
        .add_attribute("action", "resolve_spin")
        .add_attribute("token_id", token_id)
        .add_attribute("random_value", random_value.to_string())
        .add_attribute("success", is_success.to_string())
        .add_attribute("trait_target", target_str)
        .add_attribute("old_value", current_val.to_string())
        .add_attribute("new_value", new_val.to_string()))
}

fn execute_harvest(
    mut deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // 1. Verify Owner & Fetch Traits (Moved up because we need traits for Canopy calc)
    let owner_response: cw721::msg::OwnerOfResponse = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::OwnerOf {
            token_id: token_id.clone(),
            include_expired: None,
        },
    )?;

    if owner_response.owner != info.sender.to_string() {
        return Err(ContractError::Unauthorized {});
    }

    let nft_info: cw721::msg::NftInfoResponse<NftExtensionMsg> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::NftInfo {
            token_id: token_id.clone(),
        },
    )?;

    let mut traits = parse_traits(nft_info.extension);

    // 2. Load State
    let mut token_info = TOKEN_INFO.load(deps.storage, &token_id)?;
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;
    let biomass = BIOMASS.load(deps.storage)?;

    // 3. Accumulate Pending Rewards (Standard Staking Math)
    if !token_info.current_shares.is_zero() {
        let accumulated = token_info
            .current_shares
            .checked_mul(global_state.global_reward_index)?
            .checked_sub(token_info.reward_debt)
            .unwrap_or(Uint128::zero());

        token_info.pending_rewards = token_info.pending_rewards.checked_add(accumulated)?;
    }

    if token_info.pending_rewards.is_zero() {
        return Err(ContractError::NoRewards {});
    }

    // 4. Apply Canopy Multiplier (The Weather)
    // We calculate how valuable this mushroom is in the CURRENT economy
    let multiplier = calculate_canopy_multiplier(&biomass, &traits);

    // Apply multiplier to the payout
    // Payout = Pending * Multiplier
    let payout_amount = token_info.pending_rewards.mul_floor(multiplier);

    // Calculate what was forfeited due to bad weather/shadow zone
    let forfeited_amount = if payout_amount < token_info.pending_rewards {
        token_info.pending_rewards - payout_amount
    } else {
        Uint128::zero()
    };

    // If money was lost (Penalty), recycle it back to the global pool
    if !forfeited_amount.is_zero() && !global_state.total_shares.is_zero() {
        let recycle_per_share = forfeited_amount.checked_div(global_state.total_shares)?;
        global_state.global_reward_index = global_state
            .global_reward_index
            .checked_add(recycle_per_share)?;
    }

    // Shadow Zone check (if multiplier was 0)
    if payout_amount.is_zero() {
        token_info.pending_rewards = Uint128::zero();
    }

    // 5. Send Rewards (if any)
    let mut messages: Vec<cosmwasm_std::CosmosMsg> = vec![];

    if !payout_amount.is_zero() {
        let mut stats = GAME_STATS.load(deps.storage)?;
        stats.total_rewards_distributed += payout_amount;
        GAME_STATS.save(deps.storage, &stats)?;

        messages.push(
            BankMsg::Send {
                to_address: info.sender.to_string(),
                amount: vec![Coin {
                    denom: config.payment_denom.clone(),
                    amount: payout_amount,
                }],
            }
            .into(),
        );
    }

    let mut stats = GAME_STATS.load(deps.storage)?;
    stats.total_rewards_distributed += payout_amount;

    stats.total_harvests += 1;

    if !forfeited_amount.is_zero() {
        stats.total_rewards_recycled += forfeited_amount;
    }

    GAME_STATS.save(deps.storage, &stats)?;

    // 6. Reset Volatile Stats (Harvest Mechanic)
    let substrate = traits.substrate;
    traits.cap = 0;
    traits.stem = 0;
    traits.spores = 0;

    // Substrate Perks
    if substrate >= 1 {
        // If payout was 0 (Shadow Zone), random might be biased, but it doesn't matter much for game loop
        let random_seed = if payout_amount.is_zero() {
            info.sender.to_string().len() as u128
        } else {
            payout_amount.u128()
        };

        let random = (random_seed % 3) as u8;
        match random {
            0 => traits.cap = 1,
            1 => traits.stem = 1,
            _ => traits.spores = 1,
        }
    }

    // 7. Recalculate Shares & Update Globals
    // Note: Biomass doesn't change during harvest (Base stats are permanent), only Shares change (Volatile stats reset)
    let old_shares = token_info.current_shares;
    let new_shares = calculate_shares(&traits);

    global_state.total_shares = global_state
        .total_shares
        .checked_sub(old_shares)?
        .checked_add(new_shares)?;

    token_info.current_shares = new_shares;
    token_info.pending_rewards = Uint128::zero();
    token_info.reward_debt = new_shares.checked_mul(global_state.global_reward_index)?;

    // 8. Save
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;

    update_leaderboard(&mut deps, token_id.clone(), new_shares)?;

    // 9. Update NFT
    messages.push(
        WasmMsg::Execute {
            contract_addr: config.cw721_addr.to_string(),
            msg: to_json_binary(&spore_fates::cw721::ExecuteMsg::UpdateTraits {
                token_id: token_id.clone(),
                traits,
            })?,
            funds: vec![],
        }
        .into(),
    );

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "harvest")
        .add_attribute("token_id", token_id)
        .add_attribute("base_payout", token_info.pending_rewards) // What they had pending
        .add_attribute("canopy_multiplier", multiplier.to_string())
        .add_attribute("final_payout", payout_amount))
}

fn execute_ascend(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    let owner_response: cw721::msg::OwnerOfResponse = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::OwnerOf {
            token_id: token_id.clone(),
            include_expired: None,
        },
    )?;

    if owner_response.owner != info.sender.to_string() {
        return Err(ContractError::Unauthorized {});
    }

    let nft_info: cw721::msg::NftInfoResponse<NftExtensionMsg> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::NftInfo {
            token_id: token_id.clone(),
        },
    )?;

    let mut traits = parse_traits(nft_info.extension);

    if traits.cap != 3 || traits.stem != 3 || traits.spores != 3 {
        return Err(ContractError::NotMaxLevel {});
    }

    if traits.substrate >= 4 {
        return Err(ContractError::MaxSubstrate {});
    }

    let mut token_info = TOKEN_INFO.load(deps.storage, &token_id)?;

    if token_info.pending_rewards.is_zero() {
        return Err(ContractError::NoRewards {});
    }

    let mut global_state = GLOBAL_STATE.load(deps.storage)?;
    let random = get_randomness(&env, &deps, global_state.spin_nonce)?;
    global_state.spin_nonce += 1;

    let success = random % 5 == 0;

    let new_substrate = if success {
        traits.substrate + 1
    } else {
        traits.substrate
    };

    if success {
        traits.substrate += 1;
    }

    traits.cap = 0;
    traits.stem = 0;
    traits.spores = 0;

    let burned_amount = token_info.pending_rewards;

    token_info.pending_rewards = Uint128::zero();

    global_state.total_shares = global_state
        .total_shares
        .checked_sub(token_info.current_shares)?;
    let new_shares = calculate_shares(&traits);
    global_state.total_shares = global_state.total_shares.checked_add(new_shares)?;

    if !global_state.total_shares.is_zero() {
        let reward_part = burned_amount.u128();
        let reward_per_share = reward_part / global_state.total_shares.u128();

        global_state.global_reward_index = global_state
            .global_reward_index
            .checked_add(Uint128::from(reward_per_share))?;
    }

    token_info.current_shares = new_shares;
    token_info.reward_debt = new_shares.checked_mul(global_state.global_reward_index)?;

    GLOBAL_STATE.save(deps.storage, &global_state)?;
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;

    let mut stats = GAME_STATS.load(deps.storage)?;
    stats.total_ascensions += 1;
    stats.total_rewards_recycled += burned_amount;

    GAME_STATS.save(deps.storage, &stats)?;

    update_leaderboard(&mut deps, token_id.clone(), new_shares)?;

    let update_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&spore_fates::cw721::ExecuteMsg::UpdateTraits {
            token_id: token_id.clone(),
            traits,
        })?,
        funds: vec![],
    };

    Ok(Response::new()
        .add_message(update_msg)
        .add_attribute("action", "ascend")
        .add_attribute("token_id", token_id)
        .add_attribute("success", success.to_string())
        .add_attribute("new_substrate", new_substrate.to_string()))
}

fn execute_splice(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    parent_1_id: String,
    parent_2_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    if parent_1_id == parent_2_id {
        return Err(ContractError::InvalidParents {});
    }

    // 1. Verify Ownership & Load Parents
    let parent_1_traits =
        load_and_verify_nft(&deps, &config.cw721_addr, &parent_1_id, &info.sender)?;
    let parent_2_traits =
        load_and_verify_nft(&deps, &config.cw721_addr, &parent_2_id, &info.sender)?;

    // 2. Load Global States
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;
    let mut biomass = BIOMASS.load(deps.storage)?;

    // --- NEW: CALCULATE FORFEITED REWARDS ---
    let mut total_forfeited = Uint128::zero();

    // Helper closure to calculate raw pending for a token
    let calculate_forfeit = |token_id: &String, g_state: &GlobalState| -> StdResult<Uint128> {
        let t_info = TOKEN_INFO.load(deps.storage, token_id)?;
        let mut pending = t_info.pending_rewards;
        if !t_info.current_shares.is_zero() {
            let accrued = t_info
                .current_shares
                .checked_mul(g_state.global_reward_index)?
                .checked_sub(t_info.reward_debt)
                .unwrap_or(Uint128::zero());
            pending += accrued;
        }
        Ok(pending)
    };

    total_forfeited += calculate_forfeit(&parent_1_id, &global_state)?;
    total_forfeited += calculate_forfeit(&parent_2_id, &global_state)?;
    // ----------------------------------------

    // 3. Remove Parents from Ecosystem (Biomass & Shares)
    // IMPORTANT: We remove shares BEFORE distributing the forfeited rewards.
    // This ensures the rewards go to the survivors, not the mushrooms being burned.
    remove_stats_from_globals(&mut biomass, &mut global_state, &parent_1_traits);
    remove_stats_from_globals(&mut biomass, &mut global_state, &parent_2_traits);

    TOKEN_INFO.remove(deps.storage, &parent_1_id);
    TOKEN_INFO.remove(deps.storage, &parent_2_id);

    remove_from_leaderboard(&mut deps, &parent_1_id)?;
    remove_from_leaderboard(&mut deps, &parent_2_id)?;

    // --- NEW: RECYCLE TO SURVIVORS ---
    if !total_forfeited.is_zero() && !global_state.total_shares.is_zero() {
        let recycle_per_share = total_forfeited.checked_div(global_state.total_shares)?;
        global_state.global_reward_index = global_state
            .global_reward_index
            .checked_add(recycle_per_share)?;
    }
    // ---------------------------------

    // 4. Generate Child Genes
    let mut child_genes: Vec<u8> = Vec::with_capacity(8);
    let seed = get_randomness(&env, &deps, global_state.spin_nonce)?;
    global_state.spin_nonce += 1;

    let mut hasher = Sha256::new();
    hasher.update([seed]);
    hasher.update(parent_1_id.as_bytes());
    hasher.update(parent_2_id.as_bytes());
    let hash = hasher.finalize();

    for i in 0..8 {
        let rng_byte = hash[i];
        if rng_byte < 13 {
            // 5% Mutation
            if rng_byte < 2 {
                child_genes.push(4);
            }
            // Primordial
            else {
                child_genes.push(0);
            } // Rot
        } else {
            // Inheritance
            if rng_byte % 2 == 0 {
                child_genes.push(parent_1_traits.genes.get(i).cloned().unwrap_or(0));
            } else {
                child_genes.push(parent_2_traits.genes.get(i).cloned().unwrap_or(0));
            }
        }
    }

    let sum_substrate = parent_1_traits.substrate + parent_2_traits.substrate;
    let mut inherited_substrate = sum_substrate / 2;

    // 2. Synergy Bonus (Chance to upgrade if parents are equal)
    let mutation_byte = hash[8];

    // If parents are same level and > 0, 20% chance to upgrade
    if parent_1_traits.substrate > 0 && parent_1_traits.substrate == parent_2_traits.substrate {
        // 20% chance (approx 51/255)
        if mutation_byte < 51 {
            inherited_substrate += 1;
        }
    }

    // Cap at 4 (Mycelial Network)
    if inherited_substrate > 5 {
        inherited_substrate = 5;
    }

    // 5. Create Child & Stats
    let mut child_traits = TraitExtension {
        cap: 0,
        stem: 0,
        spores: 0,
        substrate: inherited_substrate,
        genes: child_genes,
        base_cap: 0,
        base_stem: 0,
        base_spores: 0,
    };
    child_traits.recalculate_base_stats();

    // 6. Add Child to Ecosystem
    add_stats_to_globals(&mut biomass, &mut global_state, &child_traits);

    // 7. Save
    BIOMASS.save(deps.storage, &biomass)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;

    // Update Stats (Burn count)
    let mut game_stats = GAME_STATS.load(deps.storage)?;
    game_stats.total_burned += 2;
    game_stats.total_minted += 1;
    game_stats.total_splices += 1;
    game_stats.total_rewards_recycled += total_forfeited;
    GAME_STATS.save(deps.storage, &game_stats)?;

    // 8. Mint Child
    let current_id = MINT_COUNTER.load(deps.storage)?;
    let next_id = current_id + 1;
    MINT_COUNTER.save(deps.storage, &next_id)?;
    let child_id = current_id.to_string();

    let child_shares = calculate_shares(&child_traits);
    let child_info = TokenInfo {
        current_shares: child_shares,
        // Child enters at the NEW, higher index (doesn't get the recycled rewards)
        reward_debt: child_shares.checked_mul(global_state.global_reward_index)?,
        pending_rewards: Uint128::zero(),
    };
    TOKEN_INFO.save(deps.storage, &child_id, &child_info)?;

    update_leaderboard(&mut deps, child_id.clone(), child_shares)?;

    // Messages
    let burn_msg_1 = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&spore_fates::cw721::ExecuteMsg::Burn {
            token_id: parent_1_id.clone(),
        })?,
        funds: vec![],
    };
    let burn_msg_2 = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&spore_fates::cw721::ExecuteMsg::Burn {
            token_id: parent_2_id.clone(),
        })?,
        funds: vec![],
    };
    let mint_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&spore_fates::cw721::ExecuteMsg::Mint {
            token_id: child_id.clone(),
            owner: info.sender.to_string(),
            token_uri: None,
            extension: child_traits,
        })?,
        funds: vec![],
    };

    Ok(Response::new()
        .add_message(burn_msg_1)
        .add_message(burn_msg_2)
        .add_message(mint_msg)
        .add_attribute("action", "splice")
        .add_attribute("parent_1", parent_1_id)
        .add_attribute("parent_2", parent_2_id)
        .add_attribute("child_id", child_id)
        .add_attribute("recycled_amount", total_forfeited))
}

fn execute_recycle(
    mut deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // 1. Verify Ownership & Load Traits
    let traits = load_and_verify_nft(&deps, &config.cw721_addr, &token_id, &info.sender)?;

    // 2. Remove from Game State
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;
    let mut biomass = BIOMASS.load(deps.storage)?;

    // (Helper we defined earlier)
    remove_stats_from_globals(&mut biomass, &mut global_state, &traits);

    // Remove from internal maps
    TOKEN_INFO.remove(deps.storage, &token_id);
    remove_from_leaderboard(&mut deps, &token_id)?; // Don't forget this!

    // 3. Update Stats (Supply decreases, Price drops)
    let mut stats = GAME_STATS.load(deps.storage)?;
    stats.total_burned += 1;
    // Optional: stats.total_recycled += 1;
    GAME_STATS.save(deps.storage, &stats)?;

    BIOMASS.save(deps.storage, &biomass)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;

    // 4. Burn the NFT (Cross-contract call)
    // This works because the Game Contract IS the minter/admin
    let burn_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&spore_fates::cw721::ExecuteMsg::Burn {
            token_id: token_id.clone(),
        })?,
        funds: vec![],
    };

    Ok(Response::new()
        .add_message(burn_msg)
        .add_attribute("action", "recycle")
        .add_attribute("token_id", token_id))
}

fn load_and_verify_nft(
    deps: &DepsMut,
    contract: &Addr,
    token_id: &str,
    owner: &Addr,
) -> Result<TraitExtension, ContractError> {
    // 1. Check Owner
    let owner_res: cw721::msg::OwnerOfResponse = deps.querier.query_wasm_smart(
        contract.to_string(),
        &cw721::msg::Cw721QueryMsg::<TraitExtension, Empty, Empty>::OwnerOf {
            token_id: token_id.to_owned(),
            include_expired: None,
        },
    )?;

    if owner_res.owner != owner.to_string() {
        return Err(ContractError::Unauthorized {});
    }

    // 2. Get Traits
    let nft_info: cw721::msg::NftInfoResponse<NftExtensionMsg> = deps.querier.query_wasm_smart(
        contract.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::NftInfo {
            token_id: token_id.to_owned(),
        },
    )?;

    Ok(parse_traits(nft_info.extension))
}

// Logic to add a mushroom's stats to the global counters
fn add_stats_to_globals(
    biomass: &mut GlobalBiomass,
    global_state: &mut GlobalState,
    traits: &TraitExtension,
) {
    biomass.total_base_cap += traits.base_cap as u128;
    biomass.total_base_stem += traits.base_stem as u128;
    biomass.total_base_spores += traits.base_spores as u128;

    let shares = calculate_shares(traits);
    global_state.total_shares += shares;
}

// Logic to remove a mushroom's stats from the global counters
fn remove_stats_from_globals(
    biomass: &mut GlobalBiomass,
    global_state: &mut GlobalState,
    traits: &TraitExtension,
) {
    biomass.total_base_cap = biomass
        .total_base_cap
        .saturating_sub(traits.base_cap as u128);
    biomass.total_base_stem = biomass
        .total_base_stem
        .saturating_sub(traits.base_stem as u128);
    biomass.total_base_spores = biomass
        .total_base_spores
        .saturating_sub(traits.base_spores as u128);

    let shares = calculate_shares(traits);
    global_state.total_shares = global_state.total_shares.saturating_sub(shares);
}

fn count_primordial(genes: &[u8]) -> usize {
    genes.iter().filter(|&&g| g == 3).count() // Assuming 3 is Primordial ID based on your parse_traits
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetPendingSpin { token_id } => {
            to_json_binary(&query_pending_spin(deps, token_id)?)
        }
        QueryMsg::Config {} => to_json_binary(&CONFIG.load(deps.storage)?),
        QueryMsg::GlobalState {} => to_json_binary(&GLOBAL_STATE.load(deps.storage)?),
        QueryMsg::TokenInfo { token_id } => {
            to_json_binary(&TOKEN_INFO.may_load(deps.storage, &token_id)?)
        }
        QueryMsg::GetPendingRewards { token_id } => {
            to_json_binary(&query_pending_rewards(deps, token_id)?)
        }
        QueryMsg::GetEcosystemMetrics {} => to_json_binary(&query_ecosystem_metrics(deps)?),
        QueryMsg::GetGameStats {} => to_json_binary(&query_game_stats(deps)?),
        QueryMsg::GetCurrentMintPrice {} => to_json_binary(&query_current_mint_price(deps)?),
        QueryMsg::GetPlayerProfile {
            address,
            start_after,
            limit,
        } => to_json_binary(&query_player_profile(deps, address, start_after, limit)?),
        QueryMsg::GetLeaderboard {} => to_json_binary(&query_leaderboard(deps)?),
    }
}

fn query_leaderboard(deps: Deps) -> StdResult<LeaderboardResponse> {
    let entries = LEADERBOARD.load(deps.storage).unwrap_or_default();
    Ok(LeaderboardResponse { entries })
}

fn query_pending_spin(deps: Deps, token_id: String) -> StdResult<PendingSpinResponse> {
    match PENDING_SPINS.may_load(deps.storage, &token_id)? {
        Some(pending) => Ok(PendingSpinResponse {
            is_pending: true,
            target_round: pending.target_round,
        }),
        None => Ok(PendingSpinResponse {
            is_pending: false,
            target_round: 0,
        }),
    }
}

fn query_player_profile(
    deps: Deps,
    address: String,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<PlayerProfileResponse> {
    let config = CONFIG.load(deps.storage)?;
    let global_state = GLOBAL_STATE.load(deps.storage)?;

    // 1. Validate Limit (Default 30, Max 100)
    let limit = limit.unwrap_or(30).min(100);

    // 2. Query CW721 for a page of tokens
    let tokens_response: cw721::msg::TokensResponse = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &&cw721::msg::Cw721QueryMsg::<TraitExtension, Empty, Empty>::Tokens {
            owner: address,
            start_after,
            limit: Some(limit),
        },
    )?;

    let mut total_shares = Uint128::zero();
    let mut total_rewards = Uint128::zero();
    let mut best_id: Option<String> = None;
    let mut max_shares = Uint128::zero();

    // 3. Iterate through this page
    for token_id in tokens_response.tokens.iter() {
        if let Some(info) = TOKEN_INFO.may_load(deps.storage, token_id)? {
            // Sum Shares
            total_shares += info.current_shares;

            // Track Best (Local Max)
            if info.current_shares > max_shares {
                max_shares = info.current_shares;
                best_id = Some(token_id.clone());
            }

            // Sum Rewards
            let mut pending = info.pending_rewards;
            if !info.current_shares.is_zero() {
                let accrued = info
                    .current_shares
                    .checked_mul(global_state.global_reward_index)?
                    .checked_sub(info.reward_debt)
                    .unwrap_or(Uint128::zero());
                pending += accrued;
            }
            total_rewards += pending;
        }
    }

    // 4. Get cursor for next page
    let last_scanned_id = tokens_response.tokens.last().cloned();

    Ok(PlayerProfileResponse {
        total_mushrooms: tokens_response.tokens.len() as u64,
        total_shares,
        total_pending_rewards: total_rewards,
        best_mushroom_id: best_id,
        last_scanned_id, // Return it so frontend knows where to continue
    })
}

fn query_current_mint_price(deps: Deps) -> StdResult<MintPriceResponse> {
    let config = CONFIG.load(deps.storage)?;
    let stats = GAME_STATS.load(deps.storage)?;

    let current_supply = stats.total_minted.saturating_sub(stats.total_burned);
    let increment_total = config.mint_cost_increment * Uint128::from(current_supply);
    let price = config.mint_cost + increment_total;

    Ok(MintPriceResponse { price })
}

fn query_game_stats(deps: Deps) -> StdResult<GameStatsResponse> {
    let stats = GAME_STATS.load(deps.storage)?;
    let biomass = BIOMASS.load(deps.storage)?;

    let current_supply = stats.total_minted.saturating_sub(stats.total_burned);

    Ok(GameStatsResponse {
        total_minted: stats.total_minted,
        total_burned: stats.total_burned,
        current_supply,
        total_spins: stats.total_spins,
        total_rewards_distributed: stats.total_rewards_distributed,
        total_biomass: biomass,
        total_mint_volume: stats.total_mint_volume,
        total_spin_volume: stats.total_spin_volume,
        total_rewards_recycled: stats.total_rewards_recycled,
        total_harvests: stats.total_harvests,
        total_splices: stats.total_splices,
        total_ascensions: stats.total_ascensions,
    })
}

fn query_pending_rewards(deps: Deps, token_id: String) -> StdResult<PendingRewardsResponse> {
    let global_state = GLOBAL_STATE.load(deps.storage)?;
    let biomass = BIOMASS.load(deps.storage)?;
    let config = CONFIG.load(deps.storage)?;

    let token_info = match TOKEN_INFO.may_load(deps.storage, &token_id)? {
        Some(info) => info,
        None => {
            return Ok(PendingRewardsResponse {
                accumulated_rewards: Uint128::zero(),
                canopy_multiplier: Decimal::one(),
                estimated_payout: Uint128::zero(),
            })
        }
    };

    // 1. Calculate Raw Accumulated (Standard Staking Math)
    let mut raw_pending = token_info.pending_rewards;

    if !token_info.current_shares.is_zero() {
        let accumulated_since_last_interaction = token_info
            .current_shares
            .checked_mul(global_state.global_reward_index)?
            .checked_sub(token_info.reward_debt)
            .unwrap_or(Uint128::zero());
        raw_pending = raw_pending.checked_add(accumulated_since_last_interaction)?;
    }

    if raw_pending.is_zero() {
        return Ok(PendingRewardsResponse {
            accumulated_rewards: Uint128::zero(),
            canopy_multiplier: Decimal::one(),
            estimated_payout: Uint128::zero(),
        });
    }

    // 2. Fetch Traits & Calculate Weather
    let nft_info: cw721::msg::NftInfoResponse<NftExtensionMsg> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::NftInfo {
            token_id: token_id.clone(),
        },
    )?;
    let traits = parse_traits(nft_info.extension);

    let multiplier = calculate_canopy_multiplier(&biomass, &traits);

    // 3. Calculate Final Payout
    let final_payout = raw_pending.mul_floor(multiplier);

    Ok(PendingRewardsResponse {
        accumulated_rewards: raw_pending,
        canopy_multiplier: multiplier,
        estimated_payout: final_payout,
    })
}

fn calculate_canopy_multiplier(biomass: &GlobalBiomass, traits: &TraitExtension) -> Decimal {
    let total_mass = biomass.total_base_cap + biomass.total_base_stem + biomass.total_base_spores;

    // If ecosystem is empty or mushroom has no genes, return standard 1.0 (or 0 if no genes)
    if total_mass == 0 {
        return Decimal::one();
    }
    let user_base_total = traits.base_cap + traits.base_stem + traits.base_spores;
    if user_base_total == 0 {
        return Decimal::one();
    }

    // Target is perfect equilibrium (33% split)
    let target_ratio = Decimal::from_ratio(1u128, 3u128); // 0.333...

    // Helper to get multiplier for a specific trait type
    let get_trait_mult = |trait_mass: u128| -> Decimal {
        if trait_mass == 0 {
            // If this trait doesn't exist in the pool yet, it is infinitely valuable.
            // Cap at 5x to prevent exploits.
            Decimal::from_str("5.0").unwrap()
        } else {
            let actual_ratio = Decimal::from_ratio(trait_mass, total_mass);
            // Multiplier = Target / Actual
            target_ratio / actual_ratio
        }
    };

    let cap_mult = get_trait_mult(biomass.total_base_cap);
    let stem_mult = get_trait_mult(biomass.total_base_stem);
    let spores_mult = get_trait_mult(biomass.total_base_spores);

    // Calculate User's "Canopy Score"
    // Score = (Base * Mult) + ...
    let score_cap = Decimal::from_ratio(traits.base_cap, 1u128) * cap_mult;
    let score_stem = Decimal::from_ratio(traits.base_stem, 1u128) * stem_mult;
    let score_spores = Decimal::from_ratio(traits.base_spores, 1u128) * spores_mult;

    let total_score = score_cap + score_stem + score_spores;

    // Calculate Efficiency (Score / Raw Stats)
    let efficiency = total_score / Decimal::from_ratio(user_base_total, 1u128);

    // Shadow Zone Logic:
    // If your efficiency is below 0.8 (meaning you are mostly composed of oversaturated traits),
    // you are in the shadow and earn 0.
    if efficiency < Decimal::from_str("0.8").unwrap() {
        return Decimal::zero();
    }

    // Otherwise, return the efficiency as the reward multiplier
    efficiency
}

fn query_ecosystem_metrics(deps: Deps) -> StdResult<EcosystemMetricsResponse> {
    let biomass = BIOMASS.load(deps.storage)?;

    let total_mass = biomass.total_base_cap + biomass.total_base_stem + biomass.total_base_spores;
    let target_ratio = Decimal::from_ratio(1u128, 3u128);

    let calc_mult = |mass: u128| -> Decimal {
        if total_mass == 0 {
            return Decimal::one();
        }
        if mass == 0 {
            return Decimal::from_str("5.0").unwrap();
        }
        let actual_ratio = Decimal::from_ratio(mass, total_mass);
        target_ratio / actual_ratio
    };

    Ok(EcosystemMetricsResponse {
        total_biomass: biomass.clone(),
        cap_multiplier: calc_mult(biomass.total_base_cap),
        stem_multiplier: calc_mult(biomass.total_base_stem),
        spores_multiplier: calc_mult(biomass.total_base_spores),
    })
}

// Helper to update the leaderboard
fn update_leaderboard(deps: &mut DepsMut, token_id: String, score: Uint128) -> StdResult<()> {
    let mut leaderboard = LEADERBOARD.load(deps.storage).unwrap_or_default();

    // 1. Remove existing entry for this token (if any) to avoid duplicates
    leaderboard.retain(|entry| entry.token_id != token_id);

    // 2. Add the new/updated entry
    leaderboard.push(LeaderboardEntry { token_id, score });

    // 3. Sort Descending by Score
    leaderboard.sort_by(|a, b| b.score.cmp(&a.score));

    // 4. Keep only Top 10
    if leaderboard.len() > 10 {
        leaderboard.truncate(10);
    }

    LEADERBOARD.save(deps.storage, &leaderboard)
}

// Helper to remove a token (for Splice/Burn)
fn remove_from_leaderboard(deps: &mut DepsMut, token_id: &String) -> StdResult<()> {
    let mut leaderboard = LEADERBOARD.load(deps.storage).unwrap_or_default();

    // Only save if we actually removed something to save gas
    let len_before = leaderboard.len();
    leaderboard.retain(|entry| &entry.token_id != token_id);

    if leaderboard.len() != len_before {
        LEADERBOARD.save(deps.storage, &leaderboard)?;
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{message_info, mock_env, MockApi, MockQuerier, MockStorage};
    use cosmwasm_std::{
        coins, from_json, Addr, ContractResult, OwnedDeps, SystemError, SystemResult,
        WasmQuery as CosmWasmQuery,
    };
    use cw721::msg::{NftInfoResponse, OwnerOfResponse};
    use cw721::state::Trait;

    const PAYMENT_DENOM: &str = "factory/creator/shroom";

    // Setup custom mocks using MockApi to generate valid Bech32 addresses
    fn mock_deps_custom() -> OwnedDeps<MockStorage, MockApi, MockQuerier> {
        OwnedDeps {
            storage: MockStorage::default(),
            api: MockApi::default(),
            querier: MockQuerier::default(),
            custom_query_type: std::marker::PhantomData,
        }
    }

    fn setup_contract(
        deps: DepsMut,
        creator: &Addr,
        cw721: &Addr,
        oracle: &Addr,
    ) -> Result<Response, ContractError> {
        let msg = InstantiateMsg {
            payment_denom: PAYMENT_DENOM.to_string(),
            spin_cost: Uint128::new(1_000_000),
            mint_cost: Uint128::new(0),
            mint_cost_increment: Uint128::new(0),
            cw721_addr: cw721.to_string(),
            oracle_addr: oracle.to_string(),
        };
        let info = message_info(creator, &[]);
        instantiate(deps, mock_env(), info, msg)
    }

    fn mock_querier_with_nft(
        querier: &mut MockQuerier,
        cw721_contract: &Addr,
        token_id: &str,
        owner: &Addr,
        traits: TraitExtension,
    ) {
        let cw721_str = cw721_contract.to_string();
        let token_id_str = token_id.to_string();
        let owner_str = owner.to_string();
        let attributes: Vec<Trait> = traits.into();

        querier.update_wasm(move |query| match query {
            CosmWasmQuery::Smart { contract_addr, msg } => {
                if contract_addr == &cw721_str {
                    let parsed: cw721::msg::Cw721QueryMsg<NftExtensionMsg, Empty, Empty> =
                        match from_json(&msg) {
                            Ok(p) => p,
                            Err(e) => {
                                return SystemResult::Err(SystemError::InvalidRequest {
                                    error: format!("Parse error: {}", e),
                                    request: msg.clone(),
                                })
                            }
                        };

                    match parsed {
                        cw721::msg::Cw721QueryMsg::NftInfo {
                            token_id: query_token_id,
                        } => {
                            if query_token_id == token_id_str {
                                let response = NftInfoResponse {
                                    token_uri: None,
                                    extension: NftExtensionMsg {
                                        attributes: Some(attributes.clone()),
                                        description: None,
                                        name: None,
                                        image: None,
                                        image_data: None,
                                        external_url: None,
                                        background_color: None,
                                        animation_url: None,
                                        youtube_url: None,
                                    },
                                };
                                SystemResult::Ok(ContractResult::Ok(
                                    to_json_binary(&response).unwrap(),
                                ))
                            } else {
                                SystemResult::Err(SystemError::InvalidRequest {
                                    error: "Token not found".to_string(),
                                    request: msg.clone(),
                                })
                            }
                        }
                        cw721::msg::Cw721QueryMsg::OwnerOf {
                            token_id: query_token_id,
                            ..
                        } => {
                            if query_token_id == token_id_str {
                                let response = OwnerOfResponse {
                                    owner: owner_str.clone(),
                                    approvals: vec![],
                                };
                                SystemResult::Ok(ContractResult::Ok(
                                    to_json_binary(&response).unwrap(),
                                ))
                            } else {
                                SystemResult::Err(SystemError::InvalidRequest {
                                    error: "Token not found".to_string(),
                                    request: msg.clone(),
                                })
                            }
                        }
                        _ => SystemResult::Err(SystemError::UnsupportedRequest {
                            kind: "Unsupported query".to_string(),
                        }),
                    }
                } else {
                    SystemResult::Err(SystemError::UnsupportedRequest {
                        kind: "Unknown contract".to_string(),
                    })
                }
            }
            _ => SystemResult::Err(SystemError::UnsupportedRequest {
                kind: "Unsupported query type".to_string(),
            }),
        });
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");

        let res = setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        assert_eq!(res.attributes.len(), 2);
        assert_eq!(res.attributes[0].value, "instantiate");
        assert_eq!(res.attributes[1].value, PAYMENT_DENOM);

        // Query config
        let query_msg = QueryMsg::Config {};
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let config: GameConfig = from_json(&res).unwrap();

        assert_eq!(config.payment_denom, PAYMENT_DENOM);
        assert_eq!(config.spin_cost, Uint128::new(1_000_000));

        // Query global state
        let query_msg = QueryMsg::GlobalState {};
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let global_state: GlobalState = from_json(&res).unwrap();

        assert_eq!(global_state.total_shares, Uint128::zero());
        assert_eq!(global_state.global_reward_index, Uint128::zero());
        assert_eq!(global_state.spin_nonce, 0);
    }

    #[test]
    fn test_mint_bonding_curve() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let user = deps.api.addr_make("user");
        let cw721 = deps.api.addr_make("cw721");
        let oracle = deps.api.addr_make("oracle");

        // 1. Instantiate
        let msg = InstantiateMsg {
            payment_denom: PAYMENT_DENOM.to_string(),
            spin_cost: Uint128::new(100),
            mint_cost: Uint128::new(100),
            mint_cost_increment: Uint128::new(10),
            oracle_addr: oracle.to_string(),
            cw721_addr: cw721.to_string(),
        };
        let info = message_info(&creator, &[]);
        instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // 2. Mint #1
        let info = message_info(&user, &coins(100, PAYMENT_DENOM));
        let res = execute(deps.as_mut(), mock_env(), info, ExecuteMsg::Mint {}).unwrap();

        assert_eq!(res.attributes[0].value, "mint"); // Index 0 is action
        assert_eq!(res.attributes[1].value, "1"); // Index 1 is token_id

        // Verify Price went up
        let query_msg = QueryMsg::GetCurrentMintPrice {};
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let price_response: MintPriceResponse = from_json(&res).unwrap();
        assert_eq!(price_response.price, Uint128::new(110));

        // 3. Mint #2
        let info = message_info(&user, &coins(110, PAYMENT_DENOM));
        let res = execute(deps.as_mut(), mock_env(), info, ExecuteMsg::Mint {}).unwrap();
        assert_eq!(res.attributes[1].value, "2"); // Check Token ID

        // Verify Price went up again
        let query_msg = QueryMsg::GetCurrentMintPrice {};
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let price_response: MintPriceResponse = from_json(&res).unwrap();
        assert_eq!(price_response.price, Uint128::new(120));
    }

    #[test]
    fn test_splice_success() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let user = deps.api.addr_make("user");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        // Setup Mock Querier to handle TWO tokens (Parent 1 and Parent 2)
        let user_str = user.to_string();
        let cw721_str = cw721.to_string();

        deps.querier.update_wasm(move |query| match query {
            CosmWasmQuery::Smart { contract_addr, msg } => {
                if contract_addr == &cw721_str {
                    let parsed: cw721::msg::Cw721QueryMsg<NftExtensionMsg, Empty, Empty> =
                        from_json(msg).unwrap();
                    match parsed {
                        // Handle Ownership Check
                        cw721::msg::Cw721QueryMsg::OwnerOf { token_id, .. } => {
                            if token_id == "1" || token_id == "2" {
                                let resp = OwnerOfResponse {
                                    owner: user_str.clone(),
                                    approvals: vec![],
                                };
                                SystemResult::Ok(ContractResult::Ok(to_json_binary(&resp).unwrap()))
                            } else {
                                SystemResult::Err(SystemError::InvalidRequest {
                                    error: "Not found".into(),
                                    request: msg.clone(),
                                })
                            }
                        }
                        // Handle Trait Fetching
                        cw721::msg::Cw721QueryMsg::NftInfo { token_id } => {
                            let genes = if token_id == "1" {
                                vec![1, 1, 1, 1, 1, 1, 1, 1] // Parent 1: All Cap
                            } else {
                                vec![2, 2, 2, 2, 2, 2, 2, 2] // Parent 2: All Stem
                            };

                            let extension = NftExtensionMsg {
                                attributes: Some(
                                    TraitExtension {
                                        genes,
                                        ..TraitExtension::default()
                                    }
                                    .into(),
                                ),
                                ..NftExtensionMsg::default()
                            };

                            let resp = NftInfoResponse {
                                token_uri: None,
                                extension,
                            };
                            SystemResult::Ok(ContractResult::Ok(to_json_binary(&resp).unwrap()))
                        }
                        _ => SystemResult::Err(SystemError::UnsupportedRequest {
                            kind: "skip".into(),
                        }),
                    }
                } else {
                    SystemResult::Err(SystemError::UnsupportedRequest {
                        kind: "wrong contract".into(),
                    })
                }
            }
            _ => SystemResult::Err(SystemError::UnsupportedRequest {
                kind: "skip".into(),
            }),
        });

        // Seed TOKEN_INFO so splicing can delete them
        let dummy_info = TokenInfo {
            current_shares: Uint128::zero(),
            reward_debt: Uint128::zero(),
            pending_rewards: Uint128::zero(),
        };
        TOKEN_INFO
            .save(deps.as_mut().storage, "1", &dummy_info)
            .unwrap();
        TOKEN_INFO
            .save(deps.as_mut().storage, "2", &dummy_info)
            .unwrap();
        // Set Mint Counter to 2 (since 1 and 2 exist)
        MINT_COUNTER.save(deps.as_mut().storage, &2).unwrap();

        // EXECUTE SPLICE
        let info = message_info(&user, &[]);
        let msg = ExecuteMsg::Splice {
            parent_1_id: "1".to_string(),
            parent_2_id: "2".to_string(),
        };
        let res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Verify Actions
        assert_eq!(res.attributes[0].value, "splice");
        assert_eq!(res.attributes[3].value, "2"); // Child ID (Mint Logic: uses current (2), sets next to 3)

        // Verify Messages sent to CW721
        assert_eq!(res.messages.len(), 3);
        // Msg 0: Burn 1
        // Msg 1: Burn 2
        // Msg 2: Mint Child
    }

    #[test]
    fn test_ascend_success() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let user = deps.api.addr_make("user");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        // 1. Setup NFT
        let traits = TraitExtension {
            cap: 3,
            stem: 3,
            spores: 3,
            substrate: 0,
            ..TraitExtension::default()
        };
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &user, traits);

        // 2. Add Pending Rewards
        let token_info = TokenInfo {
            current_shares: Uint128::new(100),
            reward_debt: Uint128::zero(),
            pending_rewards: Uint128::new(500),
        };
        TOKEN_INFO
            .save(deps.as_mut().storage, "1", &token_info)
            .unwrap();

        let mut global_state = GLOBAL_STATE.load(deps.as_ref().storage).unwrap();
        global_state.total_shares = Uint128::new(100);
        GLOBAL_STATE
            .save(deps.as_mut().storage, &global_state)
            .unwrap();

        let mut env = mock_env();
        env.block.time = cosmwasm_std::Timestamp::from_nanos(0);

        let msg = ExecuteMsg::Ascend {
            token_id: "1".to_string(),
        };
        let info = message_info(&user, &[]);

        let res = execute(deps.as_mut(), env, info, msg).unwrap();

        assert_eq!(res.attributes[0].value, "ascend");

        // ... (rest of the assertions remain the same)
    }

    #[test]
    fn test_harvest_success() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let user = deps.api.addr_make("user");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        // 1. Setup NFT
        let traits = TraitExtension::default();
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &user, traits);

        // 2. Setup Token Info with Rewards
        let token_info = TokenInfo {
            current_shares: Uint128::new(100),
            reward_debt: Uint128::zero(),
            pending_rewards: Uint128::new(1000),
        };
        TOKEN_INFO
            .save(deps.as_mut().storage, "1", &token_info)
            .unwrap();

        let mut global_state = GLOBAL_STATE.load(deps.as_ref().storage).unwrap();
        global_state.total_shares = Uint128::new(100);
        GLOBAL_STATE
            .save(deps.as_mut().storage, &global_state)
            .unwrap();

        let biomass = GlobalBiomass {
            total_base_cap: 100,
            total_base_stem: 100,
            total_base_spores: 100,
        };
        BIOMASS.save(deps.as_mut().storage, &biomass).unwrap();

        // 3. Harvest
        let msg = ExecuteMsg::Harvest {
            token_id: "1".to_string(),
        };
        let info = message_info(&user, &[]);
        let res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        assert_eq!(res.attributes[0].value, "harvest");
        // Note: attributes[2] might change based on order, usually 'base_payout' or 'final_payout'
        // Let's check specifically for final_payout or base_payout
        let payout_attr = res
            .attributes
            .iter()
            .find(|a| a.key == "final_payout")
            .unwrap();
        assert_eq!(payout_attr.value, "1000");

        // 4. Verify Bank Send Message
        let bank_msg = &res.messages[0].msg;
        match bank_msg {
            cosmwasm_std::CosmosMsg::Bank(BankMsg::Send { to_address, amount }) => {
                assert_eq!(to_address, &user.to_string());
                assert_eq!(amount[0].amount, Uint128::new(1000));
            }
            _ => panic!("Expected Bank Send message"),
        }

        // 5. Verify Pending Reset
        let stored_info = TOKEN_INFO.load(deps.as_ref().storage, "1").unwrap();
        assert_eq!(stored_info.pending_rewards, Uint128::zero());
    }
    #[test]
    fn test_calculate_shares() {
        // Formula: (max(1, sum_stats))^2 * (1 + substrate)

        // Case 1: All traits 0
        // Sum = 0 -> Max(1) -> 1^2 * 1 = 1
        let traits = TraitExtension {
            cap: 0,
            stem: 0,
            spores: 0,
            substrate: 0,
            genes: vec![0; 8],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(1));

        // Case 2: Positive traits
        // Sum = 2 + 1 + 3 = 6
        // Shares = 6^2 * 1 = 36
        let traits = TraitExtension {
            cap: 2,
            stem: 1,
            spores: 3,
            substrate: 0,
            genes: vec![0; 8],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(36));

        // Case 3: With substrate multiplier
        // Sum = 1 + 1 + 1 = 3
        // Substrate 2 -> Multiplier 3
        // Shares = 3^2 * 3 = 9 * 3 = 27
        let traits = TraitExtension {
            cap: 1,
            stem: 1,
            spores: 1,
            substrate: 2,
            genes: vec![0; 8],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(27));

        // Case 4: Negative traits (Floor check)
        // Sum = -6 -> Max(1)
        // Shares = 1^2 * 1 = 1
        let traits = TraitExtension {
            cap: -2,
            stem: -1,
            spores: -3,
            substrate: 0,
            genes: vec![0; 8],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(1));
    }

    #[test]
    fn test_spin_insufficient_funds() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");
        let owner = deps.api.addr_make("owner");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        let traits = TraitExtension::default();
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &owner, traits);

        let msg = ExecuteMsg::Spin {
            token_id: "1".to_string(),
            trait_target: TraitTarget::Cap,
        };

        // Send insufficient payment (500k vs 1M required)
        let info = message_info(&owner, &coins(500_000, PAYMENT_DENOM));
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();

        assert!(matches!(err, ContractError::InsufficientFunds {}));
    }

    #[test]
    fn test_spin_invalid_payment_denom() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");
        let owner = deps.api.addr_make("owner");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        let traits = TraitExtension::default();
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &owner, traits);

        let msg = ExecuteMsg::Spin {
            token_id: "1".to_string(),
            trait_target: TraitTarget::Cap,
        };

        // Send wrong denom
        let info = message_info(&owner, &coins(1_000_000, "wrong_denom"));
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();

        assert!(matches!(err, ContractError::InvalidPayment {}));
    }

    #[test]
    fn test_spin_success() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let oracle = deps.api.addr_make("oracle");
        let owner = deps.api.addr_make("owner");

        // 2. Setup with Oracle
        setup_contract(deps.as_mut(), &creator, &cw721, &oracle).unwrap();

        // 3. Define traits
        let traits = TraitExtension {
            cap: 0,
            stem: 0,
            spores: 0,
            substrate: 0,
            genes: vec![0; 8],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };

        // 4. Register Mock NFT
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &owner, traits.clone());

        // --- FIX: SEED TOKEN_INFO MANUALLY ---
        // Since we didn't call 'mint', we must manually create the token entry in storage
        let token_info = TokenInfo {
            current_shares: Uint128::new(100), // Default linear shares for 0 stats
            reward_debt: Uint128::zero(),
            pending_rewards: Uint128::zero(),
        };
        TOKEN_INFO
            .save(deps.as_mut().storage, "1", &token_info)
            .unwrap();

        // Update Global State to reflect this existing token
        // If we don't do this, reward calculations might divide by zero or underflow
        let mut global_state = GLOBAL_STATE.load(deps.as_ref().storage).unwrap();
        global_state.total_shares = Uint128::new(100);
        GLOBAL_STATE
            .save(deps.as_mut().storage, &global_state)
            .unwrap();
        // -------------------------------------

        // ==========================================
        // PHASE 1: REQUEST SPIN
        // ==========================================
        let msg = ExecuteMsg::Spin {
            token_id: "1".to_string(),
            trait_target: TraitTarget::Cap,
        };

        let mut env = mock_env();
        env.block.time = cosmwasm_std::Timestamp::from_seconds(1692803367 + 30);

        let info = message_info(&owner, &coins(1_000_000, PAYMENT_DENOM));
        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        assert_eq!(res.attributes[0].value, "request_spin");

        // Check pending spin exists
        let query_msg = QueryMsg::GetPendingSpin {
            token_id: "1".to_string(),
        };
        let res = query(deps.as_ref(), env.clone(), query_msg).unwrap();
        let pending: PendingSpinResponse = from_json(&res).unwrap();
        assert!(pending.is_pending);

        // ==========================================
        // PHASE 2: RESOLVE SPIN
        // ==========================================

        // Re-setup mock querier for Phase 2 (Logic + Oracle)
        let cw721_str = cw721.to_string();
        let oracle_str = oracle.to_string();
        let owner_str = owner.to_string();
        let traits_clone = traits.clone();

        // Need to capture the contract addr to verify the WasmMsg later
        let cw721_addr_verification = cw721_str.clone();

        deps.querier.update_wasm(move |query| match query {
            CosmWasmQuery::Smart { contract_addr, msg } => {
                if contract_addr == &cw721_str {
                    // MOCK NFT
                    let parsed: cw721::msg::Cw721QueryMsg<NftExtensionMsg, Empty, Empty> =
                        from_json(msg).unwrap();
                    match parsed {
                        cw721::msg::Cw721QueryMsg::NftInfo { .. } => {
                            let extension = NftExtensionMsg {
                                attributes: Some(traits_clone.clone().into()),
                                ..NftExtensionMsg::default()
                            };
                            SystemResult::Ok(ContractResult::Ok(
                                to_json_binary(&NftInfoResponse {
                                    token_uri: None,
                                    extension,
                                })
                                .unwrap(),
                            ))
                        }
                        _ => SystemResult::Ok(ContractResult::Ok(
                            to_json_binary(&OwnerOfResponse {
                                owner: owner_str.clone(),
                                approvals: vec![],
                            })
                            .unwrap(),
                        )),
                    }
                } else if contract_addr == &oracle_str {
                    // MOCK ORACLE RANDOMNESS
                    let resp = BeaconResponse {
                        uniform_seed: [123u8; 32],
                    };
                    SystemResult::Ok(ContractResult::Ok(to_json_binary(&resp).unwrap()))
                } else {
                    SystemResult::Err(SystemError::UnsupportedRequest {
                        kind: "unknown addr".into(),
                    })
                }
            }
            _ => SystemResult::Err(SystemError::UnsupportedRequest {
                kind: "skip".into(),
            }),
        });

        // Execute Resolve
        let resolve_msg = ExecuteMsg::ResolveSpin {
            token_id: "1".to_string(),
        };
        let info = message_info(&owner, &[]);
        let res = execute(deps.as_mut(), env, info, resolve_msg).unwrap();

        assert_eq!(res.attributes[0].value, "resolve_spin");

        // Verify NFT Update Message sent
        assert_eq!(res.messages.len(), 1);
        match &res.messages[0].msg {
            cosmwasm_std::CosmosMsg::Wasm(WasmMsg::Execute { contract_addr, .. }) => {
                assert_eq!(contract_addr, &cw721_addr_verification);
            }
            _ => panic!("Expected Wasm Execute"),
        }
    }

    #[test]
    fn test_harvest_unauthorized() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");
        let owner = deps.api.addr_make("owner");
        let other = deps.api.addr_make("other");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        // Set up mock querier with NFT owned by different user
        let traits = TraitExtension::default();
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &other, traits);

        let msg = ExecuteMsg::Harvest {
            token_id: "1".to_string(),
        };

        let info = message_info(&owner, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();

        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    #[test]
    fn test_harvest_no_rewards() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");
        let owner = deps.api.addr_make("owner");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        let traits = TraitExtension::default();
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &owner, traits);

        // Create token info with no rewards
        TOKEN_INFO
            .save(
                deps.as_mut().storage,
                "1",
                &TokenInfo {
                    current_shares: Uint128::new(100),
                    reward_debt: Uint128::zero(),
                    pending_rewards: Uint128::zero(),
                },
            )
            .unwrap();

        let msg = ExecuteMsg::Harvest {
            token_id: "1".to_string(),
        };

        let info = message_info(&owner, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();

        assert!(matches!(err, ContractError::NoRewards {}));
    }

    #[test]
    fn test_ascend_not_max_level() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");
        let owner = deps.api.addr_make("owner");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        // Traits not at max
        let traits = TraitExtension {
            cap: 2,
            stem: 3,
            spores: 3,
            substrate: 0,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &owner, traits);

        let msg = ExecuteMsg::Ascend {
            token_id: "1".to_string(),
        };

        let info = message_info(&owner, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();

        assert!(matches!(err, ContractError::NotMaxLevel {}));
    }

    #[test]
    fn test_ascend_max_substrate() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");
        let owner = deps.api.addr_make("owner");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        // Already at max substrate
        let traits = TraitExtension {
            cap: 3,
            stem: 3,
            spores: 3,
            substrate: 4,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &owner, traits);

        let msg = ExecuteMsg::Ascend {
            token_id: "1".to_string(),
        };

        let info = message_info(&owner, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();

        assert!(matches!(err, ContractError::MaxSubstrate {}));
    }

    #[test]
    fn test_query_token_info() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        // Save token info
        let token_info = TokenInfo {
            current_shares: Uint128::new(150),
            reward_debt: Uint128::new(50),
            pending_rewards: Uint128::new(100),
        };
        TOKEN_INFO
            .save(deps.as_mut().storage, "1", &token_info)
            .unwrap();

        // Query token info
        let query_msg = QueryMsg::TokenInfo {
            token_id: "1".to_string(),
        };
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let queried_info: Option<TokenInfo> = from_json(&res).unwrap();

        assert!(queried_info.is_some());
        let info = queried_info.unwrap();
        assert_eq!(info.current_shares, Uint128::new(150));
        assert_eq!(info.pending_rewards, Uint128::new(100));
    }

    #[test]
    fn test_randomness_generation() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        let env = mock_env();

        // Generate multiple random values
        let random1 = get_randomness(&env, &deps.as_mut(), 0).unwrap();
        let random2 = get_randomness(&env, &deps.as_mut(), 1).unwrap();
        let random3 = get_randomness(&env, &deps.as_mut(), 2).unwrap();

        // Values should be different due to different nonces
        assert_ne!(random1, random2);
        assert_ne!(random2, random3);
    }

    #[test]
    fn test_leaderboard_mechanics() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let oracle = deps.api.addr_make("oracle");

        // 1. Instantiate
        setup_contract(deps.as_mut(), &creator, &cw721, &oracle).unwrap();

        // Initialize empty leaderboard
        LEADERBOARD.save(deps.as_mut().storage, &vec![]).unwrap();

        for i in 1..=12 {
            let id = i.to_string();
            let score = Uint128::new(i as u128 * 10); // Score = 10, 20, 30 ... 120

            // Manually inject into leaderboard (simulating the effect of mint/spin)
            update_leaderboard(&mut deps.as_mut(), id.clone(), score).unwrap();
        }

        // 3. Query Leaderboard
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetLeaderboard {}).unwrap();
        let resp: LeaderboardResponse = from_json(&res).unwrap();

        // A. Check Length (Should be capped at 10)
        assert_eq!(resp.entries.len(), 10);

        // B. Check Sorting (Highest score first)
        // Top should be ID "12" with score 120
        assert_eq!(resp.entries[0].token_id, "12");
        assert_eq!(resp.entries[0].score, Uint128::new(120));

        // Bottom should be ID "3" with score 30 (IDs 1 and 2 fell off)
        assert_eq!(resp.entries[9].token_id, "3");
        assert_eq!(resp.entries[9].score, Uint128::new(30));

        // 4. Test Update (Harvest logic: Score drops to 0)
        // Let's say ID "12" harvests and goes to score 0.
        update_leaderboard(&mut deps.as_mut(), "12".to_string(), Uint128::zero()).unwrap();

        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetLeaderboard {}).unwrap();
        let resp: LeaderboardResponse = from_json(&res).unwrap();

        // The top spot should now be ID "11" (Score 110)
        assert_eq!(resp.entries[0].token_id, "11");

        assert_eq!(resp.entries[9].token_id, "12");
        assert_eq!(resp.entries[9].score, Uint128::zero());

        // 5. Test Removal (Splice logic)
        // Remove ID "11" (Current Top)
        remove_from_leaderboard(&mut deps.as_mut(), &"11".to_string()).unwrap();

        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetLeaderboard {}).unwrap();
        let resp: LeaderboardResponse = from_json(&res).unwrap();

        assert_eq!(resp.entries.len(), 9);

        // New Top should be "10"
        assert_eq!(resp.entries[0].token_id, "10");
    }
}
