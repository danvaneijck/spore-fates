use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Coin, Deps, DepsMut, Env, MessageInfo, Response,
    StdResult, Uint128, WasmMsg, BankMsg,
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
    
    let mut traits = nft_info.extension;
    
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
    
    let mut traits = nft_info.extension;
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
    
    let mut traits = nft_info.extension;
    
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

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info, MockQuerier};
    use cosmwasm_std::{from_json, coins, SystemError, SystemResult, WasmQuery as CosmWasmQuery};
    use cw721::{NftInfoResponse, OwnerOfResponse};

    const PYTH_CONTRACT: &str = "pyth_contract";
    const CW721_CONTRACT: &str = "cw721_contract";
    const OWNER: &str = "owner";
    const PAYMENT_DENOM: &str = "factory/creator/shroom";

    fn setup_contract(deps: DepsMut) -> Result<Response, ContractError> {
        let msg = InstantiateMsg {
            payment_denom: PAYMENT_DENOM.to_string(),
            spin_cost: Uint128::new(1_000_000),
            pyth_contract_addr: PYTH_CONTRACT.to_string(),
            price_feed_id: "test_feed_id".to_string(),
            cw721_addr: CW721_CONTRACT.to_string(),
        };
        let info = mock_info("creator", &[]);
        instantiate(deps, mock_env(), info, msg)
    }

    // Mock querier that returns NFT info
    fn mock_querier_with_nft(token_id: &str, owner: &str, traits: TraitExtension) -> MockQuerier {
        let mut querier = MockQuerier::new(&[]);
        
        querier.update_wasm(move |query| {
            match query {
                CosmWasmQuery::Smart { contract_addr, msg } => {
                    if contract_addr == CW721_CONTRACT {
                        let parsed: cw721::Cw721QueryMsg<cosmwasm_std::Empty> = from_json(msg).unwrap();
                        match parsed {
                            cw721::Cw721QueryMsg::NftInfo { token_id: query_token_id } => {
                                if query_token_id == token_id {
                                    let response = NftInfoResponse {
                                        token_uri: None,
                                        extension: traits.clone(),
                                    };
                                    SystemResult::Ok(to_json_binary(&response).into())
                                } else {
                                    SystemResult::Err(SystemError::InvalidRequest {
                                        error: "Token not found".to_string(),
                                        request: msg.clone(),
                                    })
                                }
                            }
                            cw721::Cw721QueryMsg::OwnerOf { token_id: query_token_id, .. } => {
                                if query_token_id == token_id {
                                    let response = OwnerOfResponse {
                                        owner: owner.to_string(),
                                        approvals: vec![],
                                    };
                                    SystemResult::Ok(to_json_binary(&response).into())
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
            }
        });
        
        querier
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let res = setup_contract(deps.as_mut()).unwrap();
        
        assert_eq!(res.attributes.len(), 2);
        assert_eq!(res.attributes[0].value, "instantiate");
        assert_eq!(res.attributes[1].value, PAYMENT_DENOM);
        
        // Query config
        let query_msg = QueryMsg::Config {};
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let config: Config = from_json(&res).unwrap();
        
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
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(100));
        
        // Positive traits
        let traits = TraitExtension {
            cap: 2,
            stem: 1,
            spores: 3,
            substrate: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(160)); // 100 + 20 + 10 + 30
        
        // With substrate multiplier
        let traits = TraitExtension {
            cap: 1,
            stem: 1,
            spores: 1,
            substrate: 2,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(390)); // (100 + 30) * 3
        
        // Negative traits
        let traits = TraitExtension {
            cap: -2,
            stem: -1,
            spores: -3,
            substrate: 0,
        };
        assert_eq!(calculate_shares(&traits), Uint128::new(40)); // 100 - 20 - 10 - 30
    }

    #[test]
    fn test_spin_insufficient_funds() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        let msg = ExecuteMsg::Spin {
            token_id: "1".to_string(),
            trait_target: TraitTarget::Cap,
        };
        
        // Send insufficient payment
        let info = mock_info(OWNER, &coins(500_000, PAYMENT_DENOM));
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        
        assert!(matches!(err, ContractError::InsufficientFunds {}));
    }

    #[test]
    fn test_spin_invalid_payment_denom() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        let msg = ExecuteMsg::Spin {
            token_id: "1".to_string(),
            trait_target: TraitTarget::Cap,
        };
        
        // Send wrong denom
        let info = mock_info(OWNER, &coins(1_000_000, "wrong_denom"));
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        
        assert!(matches!(err, ContractError::InvalidPayment {}));
    }

    #[test]
    fn test_spin_success() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        // Set up mock querier with NFT
        let traits = TraitExtension {
            cap: 0,
            stem: 0,
            spores: 0,
            substrate: 0,
        };
        deps.querier = mock_querier_with_nft("1", OWNER, traits);
        
        let msg = ExecuteMsg::Spin {
            token_id: "1".to_string(),
            trait_target: TraitTarget::Cap,
        };
        
        let info = mock_info(OWNER, &coins(1_000_000, PAYMENT_DENOM));
        let res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();
        
        // Should have update message
        assert_eq!(res.messages.len(), 1);
        assert_eq!(res.attributes[0].value, "spin");
        
        // Check global state updated
        let global_state = GLOBAL_STATE.load(deps.as_ref().storage).unwrap();
        assert_eq!(global_state.spin_nonce, 1);
    }

    #[test]
    fn test_harvest_unauthorized() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        // Set up mock querier with NFT owned by different user
        let traits = TraitExtension::default();
        deps.querier = mock_querier_with_nft("1", "different_owner", traits);
        
        let msg = ExecuteMsg::Harvest {
            token_id: "1".to_string(),
        };
        
        let info = mock_info(OWNER, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        
        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    #[test]
    fn test_harvest_no_rewards() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        let traits = TraitExtension::default();
        deps.querier = mock_querier_with_nft("1", OWNER, traits);
        
        // Create token info with no rewards
        TOKEN_INFO.save(
            deps.as_mut().storage,
            "1",
            &TokenInfo {
                current_shares: Uint128::new(100),
                reward_debt: Uint128::zero(),
                pending_rewards: Uint128::zero(),
            },
        ).unwrap();
        
        let msg = ExecuteMsg::Harvest {
            token_id: "1".to_string(),
        };
        
        let info = mock_info(OWNER, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        
        assert!(matches!(err, ContractError::NoRewards {}));
    }

    #[test]
    fn test_ascend_not_max_level() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        // Traits not at max
        let traits = TraitExtension {
            cap: 2,
            stem: 3,
            spores: 3,
            substrate: 0,
        };
        deps.querier = mock_querier_with_nft("1", OWNER, traits);
        
        let msg = ExecuteMsg::Ascend {
            token_id: "1".to_string(),
        };
        
        let info = mock_info(OWNER, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        
        assert!(matches!(err, ContractError::NotMaxLevel {}));
    }

    #[test]
    fn test_ascend_max_substrate() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        // Already at max substrate
        let traits = TraitExtension {
            cap: 3,
            stem: 3,
            spores: 3,
            substrate: 4,
        };
        deps.querier = mock_querier_with_nft("1", OWNER, traits);
        
        let msg = ExecuteMsg::Ascend {
            token_id: "1".to_string(),
        };
        
        let info = mock_info(OWNER, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        
        assert!(matches!(err, ContractError::MaxSubstrate {}));
    }

    #[test]
    fn test_query_token_info() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        // Save token info
        let token_info = TokenInfo {
            current_shares: Uint128::new(150),
            reward_debt: Uint128::new(50),
            pending_rewards: Uint128::new(100),
        };
        TOKEN_INFO.save(deps.as_mut().storage, "1", &token_info).unwrap();
        
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
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        let env = mock_env();
        
        // Generate multiple random values
        let random1 = get_randomness(&env, &deps.as_mut(), 0).unwrap();
        let random2 = get_randomness(&env, &deps.as_mut(), 1).unwrap();
        let random3 = get_randomness(&env, &deps.as_mut(), 2).unwrap();
        
        // Values should be different due to different nonces
        assert_ne!(random1, random2);
        assert_ne!(random2, random3);
        
        // All values should be in valid range (0-255)
        assert!(random1 <= 255);
        assert!(random2 <= 255);
        assert!(random3 <= 255);
    }
}
