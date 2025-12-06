use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw721_base::Cw721Contract;

pub mod msg;
pub mod state;
pub mod error;

use crate::msg::{InstantiateMsg, ExecuteMsg, QueryMsg, TraitExtension};
use crate::error::ContractError;

// Version info for migration
const CONTRACT_NAME: &str = "crates.io:cw721-spore";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

pub type Extension = TraitExtension;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let base_contract = Cw721Contract::<Extension, Empty, Empty, Empty>::default();
    
    let res = base_contract.instantiate(
        deps,
        env,
        info,
        cw721_base::InstantiateMsg {
            name: msg.name,
            symbol: msg.symbol,
            minter: msg.minter,
        },
    )?;
    
    Ok(res)
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::UpdateTraits { token_id, traits } => {
            execute_update_traits(deps, env, info, token_id, traits)
        }
        // Delegate all other messages to cw721-base
        _ => {
            let base_contract = Cw721Contract::<Extension, Empty, Empty, Empty>::default();
            Ok(base_contract.execute(deps, env, info, msg.into())?)
        }
    }
}

/// Only the game controller can update traits
fn execute_update_traits(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    token_id: String,
    traits: TraitExtension,
) -> Result<Response, ContractError> {
    // Load the game controller address from config
    // For simplicity, we'll check if sender is the minter (game controller)
    let base_contract = Cw721Contract::<Extension, Empty, Empty, Empty>::default();
    let minter = base_contract.minter.load(deps.storage)?;
    
    if info.sender != minter {
        return Err(ContractError::Unauthorized {});
    }
    
    // Validate trait ranges
    if traits.cap < -3 || traits.cap > 3 {
        return Err(ContractError::InvalidTrait { trait_name: "cap".to_string() });
    }
    if traits.stem < -3 || traits.stem > 3 {
        return Err(ContractError::InvalidTrait { trait_name: "stem".to_string() });
    }
    if traits.spores < -3 || traits.spores > 3 {
        return Err(ContractError::InvalidTrait { trait_name: "spores".to_string() });
    }
    if traits.substrate > 4 {
        return Err(ContractError::InvalidTrait { trait_name: "substrate".to_string() });
    }
    
    // Update the token's extension
    base_contract.tokens.update(
        deps.storage,
        &token_id,
        |token| -> StdResult<_> {
            let mut token = token.ok_or_else(|| {
                cosmwasm_std::StdError::not_found(format!("Token {}", token_id))
            })?;
            token.extension = Some(traits.clone());
            Ok(token)
        },
    )?;
    
    Ok(Response::new()
        .add_attribute("action", "update_traits")
        .add_attribute("token_id", token_id)
        .add_attribute("cap", traits.cap.to_string())
        .add_attribute("stem", traits.stem.to_string())
        .add_attribute("spores", traits.spores.to_string())
        .add_attribute("substrate", traits.substrate.to_string()))
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    let base_contract = Cw721Contract::<Extension, Empty, Empty, Empty>::default();
    base_contract.query(deps, env, msg.into())
}

use cosmwasm_std::Empty;
