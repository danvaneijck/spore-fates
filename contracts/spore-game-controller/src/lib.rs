use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Coin, Deps, DepsMut, Env, MessageInfo, Response,
    StdResult, Uint128, WasmMsg, CosmosMsg, BankMsg, QueryRequest, WasmQuery,
};
use sha2::{Sha256, Digest};

pub mod msg;
pub mod state;
pub mod error;

use crate::msg::{InstantiateMsg, ExecuteMsg, QueryMsg, TraitExtension, TraitTarget};
use crate::state::{Config, GlobalState, TokenInfo, CONFIG, GLOBAL_STATE, TOKEN_INFO};
use crate::error::ContractError;

const CONTRACT_NAME: &str = "crates.io:spore-game-controller";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let config = Config {
        payment_denom: msg.payment_denom,
        spin_cost: msg.spin_cost,
        pyth_contract_addr: deps.api.addr_validate(&msg.pyth_contract_addr)?,
        price_feed_id: msg.price_feed_id,
        cw721_addr: deps.api.addr_validate(&msg.cw721_addr)?,
    };
    
    let global_state = GlobalState {
        total_shares: Uint128::zero(),
        global_reward_index: Uint128::zero(),
        spin_nonce: 0u64,
    };
    
    CONFIG.save(deps.storage, &config)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    
    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("payment_denom", config.payment_denom))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Spin { token_id, trait_target } => {
            execute_spin(deps, env, info, token_id, trait_target)
        }
        ExecuteMsg::Harvest { token_id } => {
            execute_harvest(deps, env, info, token_id)
        }
        ExecuteMsg::Ascend { token_id } => {
            execute_ascend(deps, env, info, token_id)
        }
    }
}

/// Get randomness using Pyth price feed + block data
fn get_randomness(env: &Env, deps: &DepsMut, nonce: u64) -> Result<u8, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Query Pyth contract for price data
    // Note: This is a simplified version. In production, you'd query the actual Pyth contract
    // For now, we'll use block data as the primary entropy source
    
    let mut hasher = Sha256::new();
    
    // Add block time (nanoseconds)
    hasher.update(env.block.time.nanos().to_le_bytes());
    
    // Add block height
    hasher.update(env.block.height.to_le_bytes());
    
    // Add nonce
    hasher.update(nonce.to_le_bytes());
    
    // In production, add Pyth price data here:
    // let price_data = query_pyth_price(deps, &config.pyth_contract_addr, &config.price_feed_id)?;
    // hasher.update(price_data.price.to_le_bytes());
    // hasher.update(price_data.conf.to_le_bytes());
    
    let result = hasher.finalize();
    
    // Return first byte as random number (0-255)
    Ok(result[0])
}

/// Calculate shares based on traits
fn calculate_shares(traits: &TraitExtension) -> Uint128 {
    let base_shares = 100u128;
    let cap_bonus = (traits.cap as i128) * 10;
    let stem_bonus = (traits.stem as i128) * 10;
    let spores_bonus = (traits.spores as i128) * 10;
    let substrate_multiplier = 1 + (traits.substrate as u128);
    
    let total = (base_shares as i128 + cap_bonus + stem_bonus + spores_bonus).max(10) as u128;
    Uint128::from(total * substrate_multiplier)
}

fn execute_spin(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
    trait_target: TraitTarget,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Validate payment
    let payment = info.funds.iter()
        .find(|coin| coin.denom == config.payment_denom)
        .ok_or(ContractError::InvalidPayment {})?;
    
    if payment.amount < config.spin_cost {
        return Err(ContractError::InsufficientFunds {});
    }
    
    // Load global state
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;
    
    // Load or create token info
    let mut token_info = TOKEN_INFO
        .may_load(deps.storage, &token_id)?
        .unwrap_or(TokenInfo {
            current_shares: Uint128::zero(),
            reward_debt: Uint128::zero(),
            pending_rewards: Uint128::zero(),
        });
    
    // Query current traits from NFT contract
    let nft_info: cw721::NftInfoResponse<TraitExtension> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::Cw721QueryMsg::NftInfo { token_id: token_id.clone() },
    )?;
    
    let mut traits = nft_info.extension.unwrap_or(TraitExtension {
        cap: 0,
        stem: 0,
        spores: 0,
        substrate: 0,
    });
    
    // Checkpoint rewards
    if !token_info.current_shares.is_zero() && !global_state.total_shares.is_zero() {
        let pending = token_info.current_shares
            .checked_mul(global_state.global_reward_index)?
            .checked_sub(token_info.reward_debt)?;
        token_info.pending_rewards = token_info.pending_rewards.checked_add(pending)?;
    }
    
    // Get randomness
    let random_value = get_randomness(&env, &deps, global_state.spin_nonce)?;
    global_state.spin_nonce += 1;
    
    // Determine success threshold based on substrate level
    let success_threshold = if traits.substrate >= 3 { 140u8 } else { 128u8 };
    let is_success = random_value >= success_threshold;
    
    // Get current trait value
    let current_value = match trait_target {
        TraitTarget::Cap => traits.cap,
        TraitTarget::Stem => traits.stem,
        TraitTarget::Spores => traits.spores,
    };
    
    // Apply swap rule and mutation
    let new_value = if is_success {
        // Win: -1 becomes +1, others increment
        if current_value == -1 {
            1
        } else {
            (current_value + 1).min(3)
        }
    } else {
        // Loss: +1 becomes -1 (unless substrate >= 2), others decrement
        if current_value == 1 && traits.substrate >= 2 {
            current_value // Safety net
        } else if current_value == 1 {
            -1
        } else {
            (current_value - 1).max(-3)
        }
    };
    
    // Apply substrate level 4 bonus (10% chance for +2 on win)
    let final_value = if is_success && traits.substrate >= 4 && random_value % 10 == 0 {
        (new_value + 1).min(3)
    } else {
        new_value
    };
    
    // Update trait
    match trait_target {
        TraitTarget::Cap => traits.cap = final_value,
        TraitTarget::Stem => traits.stem = final_value,
        TraitTarget::Spores => traits.spores = final_value,
    }
    
    // Recalculate shares
    let old_shares = token_info.current_shares;
    let new_shares = calculate_shares(&traits);
    
    // Update global state
    global_state.total_shares = global_state.total_shares
        .checked_sub(old_shares)?
        .checked_add(new_shares)?;
    
    // Add spin revenue to reward pool
    if !global_state.total_shares.is_zero() {
        let reward_per_share = config.spin_cost
            .checked_div(global_state.total_shares)?;
        global_state.global_reward_index = global_state.global_reward_index
            .checked_add(reward_per_share)?;
    }
    
    // Update token info
    token_info.current_shares = new_shares;
    token_info.reward_debt = new_shares.checked_mul(global_state.global_reward_index)?;
    
    // Save state
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;
    
    // Update NFT traits
    let update_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&crate::msg::Cw721ExecuteMsg::UpdateTraits {
            token_id: token_id.clone(),
            traits: traits.clone(),
        })?,
        funds: vec![],
    };
    
    Ok(Response::new()
        .add_message(update_msg)
        .add_attribute("action", "spin")
        .add_attribute("token_id", token_id)
        .add_attribute("trait_target", format!("{:?}", trait_target))
        .add_attribute("success", is_success.to_string())
        .add_attribute("old_value", current_value.to_string())
        .add_attribute("new_value", final_value.to_string())
        .add_attribute("random_value", random_value.to_string()))
}

fn execute_harvest(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Verify ownership
    let owner_response: cw721::OwnerOfResponse = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::Cw721QueryMsg::OwnerOf {
            token_id: token_id.clone(),
            include_expired: None,
        },
    )?;
    
    if owner_response.owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }
    
    // Load token info
    let mut token_info = TOKEN_INFO.load(deps.storage, &token_id)?;
    
    if token_info.pending_rewards.is_zero() {
        return Err(ContractError::NoRewards {});
    }
    
    // Send rewards
    let send_msg = BankMsg::Send {
        to_address: info.sender.to_string(),
        amount: vec![Coin {
            denom: config.payment_denom.clone(),
            amount: token_info.pending_rewards,
        }],
    };
    
    // Reset traits (except substrate)
    let nft_info: cw721::NftInfoResponse<TraitExtension> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::Cw721QueryMsg::NftInfo { token_id: token_id.clone() },
    )?;
    
    let mut traits = nft_info.extension.unwrap_or_default();
    let substrate = traits.substrate;
    
    traits.cap = 0;
    traits.stem = 0;
    traits.spores = 0;
    
    // Substrate level 1 buff: set random trait to +1
    if substrate >= 1 {
        let random = (token_info.pending_rewards.u128() % 3) as u8;
        match random {
            0 => traits.cap = 1,
            1 => traits.stem = 1,
            _ => traits.spores = 1,
        }
    }
    
    // Update shares
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;
    global_state.total_shares = global_state.total_shares.checked_sub(token_info.current_shares)?;
    
    let new_shares = calculate_shares(&traits);
    global_state.total_shares = global_state.total_shares.checked_add(new_shares)?;
    
    token_info.current_shares = new_shares;
    token_info.pending_rewards = Uint128::zero();
    token_info.reward_debt = new_shares.checked_mul(global_state.global_reward_index)?;
    
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;
    
    // Update NFT
    let update_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&crate::msg::Cw721ExecuteMsg::UpdateTraits {
            token_id: token_id.clone(),
            traits,
        })?,
        funds: vec![],
    };
    
    Ok(Response::new()
        .add_message(send_msg)
        .add_message(update_msg)
        .add_attribute("action", "harvest")
        .add_attribute("token_id", token_id)
        .add_attribute("rewards", token_info.pending_rewards))
}

fn execute_ascend(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Verify ownership
    let owner_response: cw721::OwnerOfResponse = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::Cw721QueryMsg::OwnerOf {
            token_id: token_id.clone(),
            include_expired: None,
        },
    )?;
    
    if owner_response.owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }
    
    // Load current traits
    let nft_info: cw721::NftInfoResponse<TraitExtension> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::Cw721QueryMsg::NftInfo { token_id: token_id.clone() },
    )?;
    
    let mut traits = nft_info.extension.unwrap_or_default();
    
    // Check if all traits are +3
    if traits.cap != 3 || traits.stem != 3 || traits.spores != 3 {
        return Err(ContractError::NotMaxLevel {});
    }
    
    // Check substrate limit
    if traits.substrate >= 4 {
        return Err(ContractError::MaxSubstrate {});
    }
    
    // Load token info and check rewards
    let mut token_info = TOKEN_INFO.load(deps.storage, &token_id)?;
    
    if token_info.pending_rewards.is_zero() {
        return Err(ContractError::NoRewards {});
    }
    
    // Get randomness for 20% chance
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;
    let random = get_randomness(&env, &deps, global_state.spin_nonce)?;
    global_state.spin_nonce += 1;
    
    let success = random % 5 == 0; // 20% chance
    
    if success {
        traits.substrate += 1;
    }
    
    // Reset traits
    traits.cap = 0;
    traits.stem = 0;
    traits.spores = 0;
    
    // Burn pending rewards
    token_info.pending_rewards = Uint128::zero();
    
    // Update shares
    global_state.total_shares = global_state.total_shares.checked_sub(token_info.current_shares)?;
    let new_shares = calculate_shares(&traits);
    global_state.total_shares = global_state.total_shares.checked_add(new_shares)?;
    
    token_info.current_shares = new_shares;
    token_info.reward_debt = new_shares.checked_mul(global_state.global_reward_index)?;
    
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;
    
    // Update NFT
    let update_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&crate::msg::Cw721ExecuteMsg::UpdateTraits {
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
        .add_attribute("new_substrate", traits.substrate.to_string()))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&CONFIG.load(deps.storage)?),
        QueryMsg::GlobalState {} => to_json_binary(&GLOBAL_STATE.load(deps.storage)?),
        QueryMsg::TokenInfo { token_id } => {
            to_json_binary(&TOKEN_INFO.may_load(deps.storage, &token_id)?)
        }
    }
}

impl Default for TraitExtension {
    fn default() -> Self {
        TraitExtension {
            cap: 0,
            stem: 0,
            spores: 0,
            substrate: 0,
        }
    }
}
