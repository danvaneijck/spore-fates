use cosmwasm_schema::cw_serde;
use cosmwasm_std::{
    entry_point, to_json_binary, BankMsg, Binary, Coin, Deps, DepsMut, Env, MessageInfo, Response,
    StdResult, Uint128, WasmMsg,
};
use cw2::set_contract_version;
use sha2::{Digest, Sha256};

pub mod error;
pub mod msg;
pub mod state;

use crate::error::ContractError;
use crate::msg::{
    Cw721ExecuteMsg, ExecuteMsg, InstantiateMsg, PendingRewardsResponse, QueryMsg, TraitExtension,
    TraitTarget,
};
use crate::state::{
    Config, GlobalState, TokenInfo, CONFIG, GLOBAL_STATE, MINT_COUNTER, TOKEN_INFO,
};

const CONTRACT_NAME: &str = "crates.io:spore-game-controller";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    MINT_COUNTER.save(deps.storage, &1u64)?;

    let config = Config {
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

    CONFIG.save(deps.storage, &config)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("payment_denom", config.payment_denom))
}

#[cw_serde]
pub enum Cw721OwnableMsg {
    UpdateOwnership(cw_ownable::Action),
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
        ExecuteMsg::AcceptOwnership { cw721_contract } => {
            // We must wrap AcceptOwnership inside UpdateOwnership
            let inner_msg = Cw721OwnableMsg::UpdateOwnership(cw_ownable::Action::AcceptOwnership);

            let accept_msg = to_json_binary(&inner_msg)?;

            let wasm_msg = WasmMsg::Execute {
                contract_addr: cw721_contract,
                msg: accept_msg,
                funds: vec![],
            };

            Ok(Response::new()
                .add_message(wasm_msg)
                .add_attribute("action", "accept_ownership_proxy"))
        }
    }
}

/// Get randomness using Pyth price feed + block data
fn get_randomness(env: &Env, _deps: &DepsMut, nonce: u64) -> Result<u8, ContractError> {
    let mut hasher = Sha256::new();

    // Add block time (nanoseconds)
    hasher.update(env.block.time.nanos().to_le_bytes());

    // Add block height
    hasher.update(env.block.height.to_le_bytes());

    // Add nonce
    hasher.update(nonce.to_le_bytes());

    let result = hasher.finalize();

    // Return first byte as random number (0-255)
    Ok(result[0])
}

fn execute_mint(deps: DepsMut, _env: Env, info: MessageInfo) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // 1. Payment Validation (Same as before)
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

    // 2. Get and Increment Counter
    let current_id_num = MINT_COUNTER.load(deps.storage)?;
    let next_id_num = current_id_num + 1;
    MINT_COUNTER.save(deps.storage, &next_id_num)?;

    // Convert to String for CW721
    let token_id = current_id_num.to_string();

    // 3. Initialize Default Traits
    let default_traits = TraitExtension::default();
    let initial_shares = calculate_shares(&default_traits);

    // 4. Update Global State (Rewards)
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;

    // Distribute mint cost to existing holders
    if !global_state.total_shares.is_zero() && config.mint_cost > Uint128::zero() {
        let reward_per_share = config.mint_cost.checked_div(global_state.total_shares)?;
        global_state.global_reward_index = global_state
            .global_reward_index
            .checked_add(reward_per_share)?;
    }

    global_state.total_shares = global_state.total_shares.checked_add(initial_shares)?;
    GLOBAL_STATE.save(deps.storage, &global_state)?;

    // 5. Save Token Info locally
    let token_info = TokenInfo {
        current_shares: initial_shares,
        // Calculate debt based on NEW global index
        reward_debt: initial_shares.checked_mul(global_state.global_reward_index)?,
        pending_rewards: Uint128::zero(),
    };
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;

    // 6. Send Mint Message to CW721
    let mint_msg = WasmMsg::Execute {
        contract_addr: config.cw721_addr.to_string(),
        msg: to_json_binary(&Cw721ExecuteMsg::Mint {
            token_id: token_id.clone(),
            owner: info.sender.to_string(),
            token_uri: None, // You could construct a URI here like "ipfs://.../{token_id}.json"
            extension: default_traits,
        })?,
        funds: vec![],
    };

    Ok(Response::new()
        .add_message(mint_msg)
        .add_attribute("action", "mint")
        .add_attribute("token_id", token_id) // Returns the generated ID
        .add_attribute("owner", info.sender))
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
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
    trait_target: TraitTarget,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // 1. Validate payment
    let payment = info
        .funds
        .iter()
        .find(|coin| coin.denom == config.payment_denom)
        .ok_or(ContractError::InvalidPayment {})?;

    if payment.amount < config.spin_cost {
        return Err(ContractError::InsufficientFunds {});
    }

    let mut global_state = GLOBAL_STATE.load(deps.storage)?;

    let mut token_info = TOKEN_INFO
        .may_load(deps.storage, &token_id)?
        .unwrap_or(TokenInfo {
            current_shares: Uint128::zero(),
            reward_debt: Uint128::zero(),
            pending_rewards: Uint128::zero(),
        });

    // 2. Harvest rewards from BEFORE this interaction
    if !token_info.current_shares.is_zero() && !global_state.total_shares.is_zero() {
        let pending = token_info
            .current_shares
            .checked_mul(global_state.global_reward_index)?
            .checked_sub(token_info.reward_debt)?;
        token_info.pending_rewards = token_info.pending_rewards.checked_add(pending)?;
    }

    // 3. Game Logic
    let nft_info: cw721::msg::NftInfoResponse<TraitExtension> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<TraitExtension, (), ()>::NftInfo {
            token_id: token_id.clone(),
        },
    )?;

    let mut traits = nft_info.extension;

    let random_value = get_randomness(&env, &deps, global_state.spin_nonce)?;
    global_state.spin_nonce += 1;

    let success_threshold = if traits.substrate >= 3 { 140u8 } else { 128u8 };
    let is_success = random_value >= success_threshold;

    let current_value = match trait_target {
        TraitTarget::Cap => traits.cap,
        TraitTarget::Stem => traits.stem,
        TraitTarget::Spores => traits.spores,
    };

    let new_value = if is_success {
        if current_value == -1 {
            1
        } else {
            (current_value + 1).min(3)
        }
    } else if current_value == 1 && traits.substrate >= 2 {
        current_value
    } else if current_value == 1 {
        -1
    } else {
        (current_value - 1).max(-3)
    };

    let final_value = if is_success && traits.substrate >= 4 && random_value % 10 == 0 {
        (new_value + 1).min(3)
    } else {
        new_value
    };

    match trait_target {
        TraitTarget::Cap => traits.cap = final_value,
        TraitTarget::Stem => traits.stem = final_value,
        TraitTarget::Spores => traits.spores = final_value,
    }

    // 4. Update Shares (Global Denominator)
    let new_shares = calculate_shares(&traits);

    global_state.total_shares = global_state
        .total_shares
        .checked_sub(token_info.current_shares)?
        .checked_add(new_shares)?;

    // 5. Update Index (Add Revenue)
    let old_index = global_state.global_reward_index;

    if !global_state.total_shares.is_zero() {
        let reward_per_share = config.spin_cost.checked_div(global_state.total_shares)?;
        global_state.global_reward_index = global_state
            .global_reward_index
            .checked_add(reward_per_share)?;
    }
    let new_index = global_state.global_reward_index;
    // 6. Capture Self-Reward (The Fix)
    // Credit user for the index jump caused by THEIR OWN spin cost
    let index_increase = new_index.checked_sub(old_index)?;

    if !new_shares.is_zero() {
        let self_reward = new_shares.checked_mul(index_increase)?;
        token_info.pending_rewards = token_info.pending_rewards.checked_add(self_reward)?;
    }

    // 7. Reset Debt
    // Set debt to the NEW index so we don't claim these rewards again next time
    token_info.current_shares = new_shares;
    token_info.reward_debt = new_shares.checked_mul(new_index)?;

    // Save state
    GLOBAL_STATE.save(deps.storage, &global_state)?;
    TOKEN_INFO.save(deps.storage, &token_id, &token_info)?;

    // Update NFT traits
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
        .add_attribute("action", "spin")
        .add_attribute("token_id", token_id)
        .add_attribute("trait_target", format!("{:?}", trait_target))
        .add_attribute("success", is_success.to_string())
        .add_attribute("old_value", current_value.to_string())
        .add_attribute("new_value", final_value.to_string()))
}

fn execute_harvest(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // 1. Verify ownership
    let owner_response: cw721::msg::OwnerOfResponse = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<TraitExtension, (), ()>::OwnerOf {
            token_id: token_id.clone(),
            include_expired: None,
        },
    )?;

    if owner_response.owner != info.sender.to_string() {
        return Err(ContractError::Unauthorized {});
    }

    // Load state
    let mut token_info = TOKEN_INFO.load(deps.storage, &token_id)?;
    let mut global_state = GLOBAL_STATE.load(deps.storage)?;

    // 2. CRITICAL FIX: Catch up rewards (Lazy Evaluation)
    // Calculate rewards accrued since the last action until NOW
    if !token_info.current_shares.is_zero() {
        let accumulated = token_info
            .current_shares
            .checked_mul(global_state.global_reward_index)?
            .checked_sub(token_info.reward_debt)
            .unwrap_or(Uint128::zero());

        token_info.pending_rewards = token_info.pending_rewards.checked_add(accumulated)?;
    }

    // 3. Check if there is anything to claim
    if token_info.pending_rewards.is_zero() {
        return Err(ContractError::NoRewards {});
    }

    // 4. Send rewards to user
    let payout_amount = token_info.pending_rewards;

    let send_msg = BankMsg::Send {
        to_address: info.sender.to_string(),
        amount: vec![Coin {
            denom: config.payment_denom.clone(),
            amount: payout_amount,
        }],
    };

    // 5. Reset Traits (Game Logic)
    let nft_info: cw721::msg::NftInfoResponse<TraitExtension> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<TraitExtension, (), ()>::NftInfo {
            token_id: token_id.clone(),
        },
    )?;

    let mut traits = nft_info.extension;
    let substrate = traits.substrate;

    // Reset stats
    traits.cap = 0;
    traits.stem = 0;
    traits.spores = 0;

    // Substrate bonus logic
    if substrate >= 1 {
        // Simple pseudo-random using the payout amount to determine bonus
        let random = (payout_amount.u128() % 3) as u8;
        match random {
            0 => traits.cap = 1,
            1 => traits.stem = 1,
            _ => traits.spores = 1,
        }
    }

    // 6. Update Shares (Global State)
    let old_shares = token_info.current_shares;
    let new_shares = calculate_shares(&traits); // Should return to baseline (e.g. 100)

    global_state.total_shares = global_state
        .total_shares
        .checked_sub(old_shares)?
        .checked_add(new_shares)?;

    // 7. Reset User State
    token_info.current_shares = new_shares;
    token_info.pending_rewards = Uint128::zero();
    token_info.reward_debt = new_shares.checked_mul(global_state.global_reward_index)?;

    // Save everything
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
        .add_attribute("rewards_paid", payout_amount))
}

fn execute_ascend(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // Verify ownership
    let owner_response: cw721::msg::OwnerOfResponse = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<TraitExtension, (), ()>::OwnerOf {
            token_id: token_id.clone(),
            include_expired: None,
        },
    )?;

    if owner_response.owner != info.sender.to_string() {
        return Err(ContractError::Unauthorized {});
    }

    // Load current traits
    let nft_info: cw721::msg::NftInfoResponse<TraitExtension> = deps.querier.query_wasm_smart(
        config.cw721_addr.to_string(),
        &cw721::msg::Cw721QueryMsg::<TraitExtension, (), ()>::NftInfo {
            token_id: token_id.clone(),
        },
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

    // Capture substrate value before modifying traits
    let new_substrate = if success {
        traits.substrate + 1
    } else {
        traits.substrate
    };

    if success {
        traits.substrate += 1;
    }

    // Reset traits
    traits.cap = 0;
    traits.stem = 0;
    traits.spores = 0;

    let burned_amount = token_info.pending_rewards;

    // Burn pending rewards
    token_info.pending_rewards = Uint128::zero();

    // Update shares
    global_state.total_shares = global_state
        .total_shares
        .checked_sub(token_info.current_shares)?;
    let new_shares = calculate_shares(&traits);
    global_state.total_shares = global_state.total_shares.checked_add(new_shares)?;

    if !global_state.total_shares.is_zero() {
        // Multiply by Precision
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
        .add_attribute("new_substrate", new_substrate.to_string()))
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
    }
}

// Helper function to calculate rewards on the fly
fn query_pending_rewards(deps: Deps, token_id: String) -> StdResult<PendingRewardsResponse> {
    let global_state = GLOBAL_STATE.load(deps.storage)?;

    // Attempt to load token info. If it doesn't exist, rewards are 0.
    let token_info = match TOKEN_INFO.may_load(deps.storage, &token_id)? {
        Some(info) => info,
        None => {
            return Ok(PendingRewardsResponse {
                pending_rewards: Uint128::zero(),
            })
        }
    };

    // Start with what is already stored on the "sticky note"
    let mut total_rewards = token_info.pending_rewards;

    // Calculate the gap between current global index and the user's debt
    if !token_info.current_shares.is_zero() {
        let accumulated_since_last_action = token_info
            .current_shares
            .checked_mul(global_state.global_reward_index)?
            .checked_sub(token_info.reward_debt)
            .unwrap_or(Uint128::zero()); // Safety catch for underflow (shouldn't happen)

        total_rewards = total_rewards.checked_add(accumulated_since_last_action)?;
    }

    Ok(PendingRewardsResponse {
        pending_rewards: total_rewards,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{message_info, mock_env, MockApi, MockQuerier, MockStorage};
    use cosmwasm_std::{
        coins, from_json, Addr, OwnedDeps, SystemError, SystemResult, WasmQuery as CosmWasmQuery,
    };
    use cw721::msg::{NftInfoResponse, OwnerOfResponse};

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

    // Mock querier that returns NFT info
    // NOTE: We pass Addr here to ensure we match against valid Bech32 strings
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

        querier.update_wasm(move |query| match query {
            CosmWasmQuery::Smart { contract_addr, msg } => {
                if contract_addr == &cw721_str {
                    let parsed: cw721::msg::Cw721QueryMsg<TraitExtension, (), ()> =
                        from_json(msg).unwrap();
                    match parsed {
                        cw721::msg::Cw721QueryMsg::NftInfo {
                            token_id: query_token_id,
                        } => {
                            if query_token_id == token_id_str {
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
                        cw721::msg::Cw721QueryMsg::OwnerOf {
                            token_id: query_token_id,
                            ..
                        } => {
                            if query_token_id == token_id_str {
                                let response = OwnerOfResponse {
                                    owner: owner_str.clone(),
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
