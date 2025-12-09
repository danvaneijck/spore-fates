use std::str::FromStr;

use cosmwasm_schema::cw_serde;
use cosmwasm_std::{
    entry_point, to_json_binary, Addr, BankMsg, Binary, Coin, Decimal, Deps, DepsMut, Empty, Env,
    MessageInfo, Response, StdResult, Uint128, WasmMsg,
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
    EcosystemMetricsResponse, ExecuteMsg, InstantiateMsg, PendingRewardsResponse, QueryMsg,
    TraitTarget,
};
use crate::state::{
    GameConfig, GlobalState, TokenInfo, BIOMASS, CONFIG, GLOBAL_STATE, MINT_COUNTER, TOKEN_INFO,
};

const CONTRACT_NAME: &str = "crates.io:spore-game-controller";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

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
        pyth_contract_addr: deps.api.addr_validate(&msg.pyth_contract_addr)?,
        price_feed_id: msg.price_feed_id,
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

    CONFIG.save(deps.storage, &config)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    BIOMASS.save(deps.storage, &biomass)?;

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
        ExecuteMsg::Harvest { token_id } => execute_harvest(deps, env, info, token_id),
        ExecuteMsg::Ascend { token_id } => execute_ascend(deps, env, info, token_id),
        ExecuteMsg::Mint {} => execute_mint(deps, env, info),
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

fn execute_mint(deps: DepsMut, env: Env, info: MessageInfo) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // 1. Payment Logic
    if config.mint_cost > Uint128::zero() {
        let payment = info
            .funds
            .iter()
            .find(|coin| coin.denom == config.payment_denom)
            .ok_or(ContractError::InvalidPayment {})?;

        if payment.amount < config.mint_cost {
            return Err(ContractError::InsufficientFunds {});
        }
    }

    // 2. Increment Mint Counter
    let current_id_num = MINT_COUNTER.load(deps.storage)?;
    let next_id_num = current_id_num + 1;
    MINT_COUNTER.save(deps.storage, &next_id_num)?;
    let token_id = current_id_num.to_string();

    // 3. Load Global State for Randomness
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;

    // 4. Generate Genetics
    // We get a seed from the block/nonce
    let seed_byte = get_randomness(&env, &deps, global_state.spin_nonce)?;
    global_state.spin_nonce += 1; // Always increment nonce

    // Expand the seed into 32 bytes using Sha256 so we have enough entropy for 8 genes
    let mut hasher = Sha256::new();
    hasher.update([seed_byte]);
    hasher.update(env.block.time.nanos().to_be_bytes()); // Add extra salt
    hasher.update(token_id.as_bytes()); // Add ID salt
    let hash = hasher.finalize();

    let mut new_genes: Vec<u8> = Vec::with_capacity(8);

    // Iterate 8 times for 8 slots
    for i in 0..8 {
        let random_byte = hash[i]; // Take the i-th byte from the hash

        // Tier 1 Generation Logic:
        // 0 = Rot, 1 = Cap, 2 = Stem, 3 = Spores
        // We use % 4. (Primordial '4' is not available in standard mint)
        let gene = random_byte % 4;
        new_genes.push(gene);
    }

    // 5. Create Trait Extension
    let mut new_traits = TraitExtension {
        cap: 0,
        stem: 0,
        spores: 0,
        substrate: 0,
        genes: new_genes,
        base_cap: 0,    // Will calculate
        base_stem: 0,   // Will calculate
        base_spores: 0, // Will calculate
    };

    // Calculate Base Stats based on the genes we just generated
    new_traits.recalculate_base_stats();

    // 6. Calculate Shares & Rewards
    let initial_shares = calculate_shares(&new_traits);

    if !global_state.total_shares.is_zero() && config.mint_cost > Uint128::zero() {
        let reward_per_share = config.mint_cost.checked_div(global_state.total_shares)?;
        global_state.global_reward_index = global_state
            .global_reward_index
            .checked_add(reward_per_share)?;
    }

    global_state.total_shares = global_state.total_shares.checked_add(initial_shares)?;

    // SAVE GLOBAL STATE
    let mut biomass = BIOMASS.load(deps.storage)?;

    // This helper handles both Biomass addition AND Share addition
    add_stats_to_globals(&mut biomass, &mut global_state, &new_traits);

    BIOMASS.save(deps.storage, &biomass)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;

    // 7. Save Token Info
    let token_info = TokenInfo {
        current_shares: initial_shares,
        reward_debt: initial_shares.checked_mul(global_state.global_reward_index)?,
        pending_rewards: Uint128::zero(),
    };
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;

    // 8. Mint Message (CW721)
    // Note: The CW721 contract must be updated to accept the new TraitExtension struct
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

    Ok(Response::new()
        .add_message(mint_msg)
        .add_attribute("action", "mint")
        .add_attribute("token_id", token_id)
        .add_attribute("owner", info.sender))
}

fn calculate_shares(traits: &TraitExtension) -> Uint128 {
    // OLD FORMULA: (100 + Volatile*10) * SubstrateMultiplier
    // NEW FORMULA: ((Volatile + Base) * 10) * SubstrateMultiplier

    let base_shares = 100i128;

    // Combine Volatile (-3 to 3) + Base (0 to 10)
    // Range per stat: -3 to 13
    let cap_score = (traits.cap as i128) + (traits.base_cap as i128);
    let stem_score = (traits.stem as i128) + (traits.base_stem as i128);
    let spores_score = (traits.spores as i128) + (traits.base_spores as i128);

    let total_stat_score = cap_score + stem_score + spores_score;

    // Multiplier based on Substrate (0 = 1x, 4 = 5x)
    let substrate_multiplier = 1 + (traits.substrate as u128);

    // Calculate total
    let total = (base_shares + (total_stat_score * 10)).max(10) as u128;

    Uint128::from(total * substrate_multiplier)
}

fn execute_spin(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
    trait_target: TraitTarget,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // 1. Payment Check
    let payment = info
        .funds
        .iter()
        .find(|coin| coin.denom == config.payment_denom)
        .ok_or(ContractError::InvalidPayment {})?;

    if payment.amount < config.spin_cost {
        return Err(ContractError::InsufficientFunds {});
    }

    // 2. Load State
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;
    let mut token_info = TOKEN_INFO
        .may_load(deps.storage, &token_id)?
        .unwrap_or(TokenInfo {
            current_shares: Uint128::zero(),
            reward_debt: Uint128::zero(),
            pending_rewards: Uint128::zero(),
        });

    // 3. Accumulate existing rewards before modifying shares
    if !token_info.current_shares.is_zero() && !global_state.total_shares.is_zero() {
        let pending = token_info
            .current_shares
            .checked_mul(global_state.global_reward_index)?
            .checked_sub(token_info.reward_debt)?;
        token_info.pending_rewards = token_info.pending_rewards.checked_add(pending)?;
    }

    // 4. Fetch Traits
    let nft_info: cw721::msg::NftInfoResponse<NftExtensionMsg> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<NftExtensionMsg, Empty, Empty>::NftInfo {
            token_id: token_id.clone(),
        },
    )?;

    let mut traits = parse_traits(nft_info.extension);

    // 5. RNG
    let random_value = get_randomness(&env, &deps, global_state.spin_nonce)?;
    global_state.spin_nonce += 1;

    // 6. Game Logic
    let success_threshold = if traits.substrate >= 3 { 140u8 } else { 128u8 };
    let is_success = random_value >= success_threshold;

    // Identify which stat we are modifying
    let (current_volatile, current_base) = match trait_target {
        TraitTarget::Cap => (traits.cap, traits.base_cap),
        TraitTarget::Stem => (traits.stem, traits.base_stem),
        TraitTarget::Spores => (traits.spores, traits.base_spores),
    };

    let new_volatile = if is_success {
        // WIN LOGIC
        if traits.substrate >= 4 && random_value % 10 == 0 {
            (current_volatile + 2).min(3)
        } else if current_volatile == -1 {
            1
        } else {
            (current_volatile + 1).min(3)
        }
    } else {
        // LOSS LOGIC
        // Combine protections: Apex Immunity (Base >= 10) OR Rooted Perk (at +1)
        if current_base >= 10 || (current_volatile == 1 && traits.substrate >= 2) {
            current_volatile // No penalty (Protected)
        }
        // Standard Penalty
        else if current_volatile == 1 {
            -1 // Drop to negative
        } else {
            (current_volatile - 1).max(-3)
        }
    };

    // Apply changes
    match trait_target {
        TraitTarget::Cap => traits.cap = new_volatile,
        TraitTarget::Stem => traits.stem = new_volatile,
        TraitTarget::Spores => traits.spores = new_volatile,
    }

    // 7. Recalculate Shares (This now includes Base Stats via the updated helper)
    let new_shares = calculate_shares(&traits);

    global_state.total_shares = global_state
        .total_shares
        .checked_sub(token_info.current_shares)?
        .checked_add(new_shares)?;

    // 8. Distribute Spin Cost to Global Pool
    let old_index = global_state.global_reward_index;

    if !global_state.total_shares.is_zero() {
        let reward_per_share = config.spin_cost.checked_div(global_state.total_shares)?;
        global_state.global_reward_index = global_state
            .global_reward_index
            .checked_add(reward_per_share)?;
    }

    // 9. Instant Reward Update (Self-distribution)
    // If the user owns shares, they immediately get a tiny slice of their own spin cost back
    let new_index = global_state.global_reward_index;
    let index_increase = new_index.checked_sub(old_index)?;

    if !new_shares.is_zero() {
        let self_reward = new_shares.checked_mul(index_increase)?;
        token_info.pending_rewards = token_info.pending_rewards.checked_add(self_reward)?;
    }

    token_info.current_shares = new_shares;
    token_info.reward_debt = new_shares.checked_mul(new_index)?;

    // 10. Save & Response
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;

    let update_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        // Ensure we use the local Enum that supports traits
        msg: to_json_binary(&spore_fates::cw721::ExecuteMsg::UpdateTraits {
            token_id: token_id.clone(),
            traits,
        })?,
        funds: vec![],
    };

    Ok(Response::new()
        .add_message(update_msg)
        .add_attribute("action", "spin")
        .add_attribute("token_id", token_id)
        .add_attribute("trait_target", format!("{:?}", trait_target))
        .add_attribute("success", is_success.to_string())
        .add_attribute("base_stat", current_base.to_string())
        .add_attribute("old_volatile", current_volatile.to_string())
        .add_attribute("new_volatile", new_volatile.to_string()))
}

fn execute_harvest(
    deps: DepsMut,
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

    if payout_amount.is_zero() {
        // If they are in the Shadow Zone (Multiplier 0), they technically harvest nothing,
        // but we still reset their pending rewards to 0 because they "spent" the harvest action.
        // This prevents people from hoarding pending rewards forever until weather improves.
        // (Game Design Choice: remove this line if you want them to keep pending rewards)
        token_info.pending_rewards = Uint128::zero();

        // We still proceed to reset stats below...
    }

    // 5. Send Rewards (if any)
    let mut messages: Vec<cosmwasm_std::CosmosMsg> = vec![];

    if !payout_amount.is_zero() {
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
    deps: DepsMut,
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
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    parent_1_id: String,
    parent_2_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // Prevent splicing the same mushroom
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

    // 3. Remove Parents from Ecosystem (Biomass & Shares)
    // We must remove their stats from the global pools before we burn them
    remove_stats_from_globals(&mut biomass, &mut global_state, &parent_1_traits);
    remove_stats_from_globals(&mut biomass, &mut global_state, &parent_2_traits);

    // Remove their pending rewards / share info from local state
    // (In a full implementation, you might want to auto-claim rewards here,
    // but for now we assume they are sacrificed)
    TOKEN_INFO.remove(deps.storage, &parent_1_id);
    TOKEN_INFO.remove(deps.storage, &parent_2_id);

    // 4. Generate Child Genes
    let mut child_genes: Vec<u8> = Vec::with_capacity(8);

    // Use nonce for RNG
    let seed = get_randomness(&env, &deps, global_state.spin_nonce)?;
    global_state.spin_nonce += 1;

    let mut hasher = Sha256::new();
    hasher.update([seed]);
    hasher.update(parent_1_id.as_bytes());
    hasher.update(parent_2_id.as_bytes());
    let hash = hasher.finalize();

    for i in 0..8 {
        let rng_byte = hash[i];

        // 5% Mutation Chance (13/255 approx 5%)
        if rng_byte < 13 {
            // Mutation occurred!
            // 10% Chance for Primordial (Ascension), 90% Rot
            if rng_byte < 2 {
                child_genes.push(4); // Primordial (Gold)
            } else {
                child_genes.push(0); // Rot (Grey)
            }
        } else {
            // Standard Inheritance (50/50)
            if rng_byte % 2 == 0 {
                child_genes.push(parent_1_traits.genes.get(i).cloned().unwrap_or(0));
            } else {
                child_genes.push(parent_2_traits.genes.get(i).cloned().unwrap_or(0));
            }
        }
    }

    // 5. Create Child
    let mut child_traits = TraitExtension {
        cap: 0,
        stem: 0,
        spores: 0,
        substrate: 0, // Volatile starts at 0
        genes: child_genes,
        base_cap: 0,
        base_stem: 0,
        base_spores: 0,
    };
    child_traits.recalculate_base_stats();

    // 6. Add Child to Ecosystem
    add_stats_to_globals(&mut biomass, &mut global_state, &child_traits);

    // 7. Save Global Updates
    BIOMASS.save(deps.storage, &biomass)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;

    // 8. Prepare Mint & Burn Messages
    let current_id = MINT_COUNTER.load(deps.storage)?;
    let next_id = current_id + 1;
    MINT_COUNTER.save(deps.storage, &next_id)?;

    // FIX: Use current_id for the child, just like execute_mint does
    let child_id = current_id.to_string();

    // Save Child TokenInfo
    let child_shares = calculate_shares(&child_traits);
    let child_info = TokenInfo {
        current_shares: child_shares,
        reward_debt: child_shares.checked_mul(global_state.global_reward_index)?,
        pending_rewards: Uint128::zero(),
    };
    TOKEN_INFO.save(deps.storage, &child_id, &child_info)?;

    // CW721 Messages
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
        .add_attribute("child_id", child_id))
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

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&CONFIG.load(deps.storage)?),
        QueryMsg::GlobalState {} => to_json_binary(&GLOBAL_STATE.load(deps.storage)?),
        QueryMsg::TokenInfo { token_id } => {
            to_json_binary(&TOKEN_INFO.may_load(deps.storage, &token_id)?)
        }
        QueryMsg::GetPendingRewards { token_id } => {
            to_json_binary(&query_pending_rewards(deps, token_id)?)
        }
        QueryMsg::GetEcosystemMetrics {} => to_json_binary(&query_ecosystem_metrics(deps)?),
    }
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
        pyth: &Addr,
    ) -> Result<Response, ContractError> {
        let msg = InstantiateMsg {
            payment_denom: PAYMENT_DENOM.to_string(),
            spin_cost: Uint128::new(1_000_000),
            mint_cost: Uint128::new(0),
            pyth_contract_addr: pyth.to_string(),
            price_feed_id: "test_feed_id".to_string(),
            cw721_addr: cw721.to_string(),
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
    fn test_calculate_shares() {
        // Base case: all traits at 0
        let traits = TraitExtension {
            cap: 0,
            stem: 0,
            spores: 0,
            substrate: 0,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(100));

        // Positive traits
        let traits = TraitExtension {
            cap: 2,
            stem: 1,
            spores: 3,
            substrate: 0,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(160)); // 100 + 20 + 10 + 30

        // With substrate multiplier
        let traits = TraitExtension {
            cap: 1,
            stem: 1,
            spores: 1,
            substrate: 2,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(390)); // (100 + 30) * 3

        // Negative traits
        let traits = TraitExtension {
            cap: -2,
            stem: -1,
            spores: -3,
            substrate: 0,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(40)); // 100 - 20 - 10 - 30
    }

    #[test]
    fn test_spin_insufficient_funds() {
        let mut deps = mock_deps_custom();
        let creator = deps.api.addr_make("creator");
        let cw721 = deps.api.addr_make("cw721");
        let pyth = deps.api.addr_make("pyth");
        let owner = deps.api.addr_make("owner");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        let msg = ExecuteMsg::Spin {
            token_id: "1".to_string(),
            trait_target: TraitTarget::Cap,
        };

        // Send insufficient payment
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
        let pyth = deps.api.addr_make("pyth");
        let owner = deps.api.addr_make("owner");

        setup_contract(deps.as_mut(), &creator, &cw721, &pyth).unwrap();

        // Set up mock querier with NFT
        let traits = TraitExtension {
            cap: 0,
            stem: 0,
            spores: 0,
            substrate: 0,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };
        mock_querier_with_nft(&mut deps.querier, &cw721, "1", &owner, traits);

        let msg = ExecuteMsg::Spin {
            token_id: "1".to_string(),
            trait_target: TraitTarget::Cap,
        };

        let info = message_info(&owner, &coins(1_000_000, PAYMENT_DENOM));
        let res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Should have update message
        assert_eq!(res.messages.len(), 1);
        assert_eq!(res.attributes[0].value, "spin");

        // Check global state updated
        let global_state: GlobalState =
            from_json(&query(deps.as_ref(), mock_env(), QueryMsg::GlobalState {}).unwrap())
                .unwrap();
        assert_eq!(global_state.spin_nonce, 1);
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
}
