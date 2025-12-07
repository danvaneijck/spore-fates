use cosmwasm_std::{
    entry_point, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw721_base::Cw721Contract;
use cw_ownable::update_ownership;
pub mod msg;
pub mod state;
pub mod error;

use crate::msg::{InstantiateMsg, ExecuteMsg, QueryMsg, TraitExtension};
use crate::error::ContractError;

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
    let base_contract = Cw721Contract::<Extension, Empty, Empty, Empty>::default();
    
    match msg {
        ExecuteMsg::UpdateTraits { token_id, traits } => {
            execute_update_traits(deps, env, info, token_id, traits)
        }
        ExecuteMsg::Mint { token_id, owner, token_uri, extension } => {
            let cw721_msg = cw721_base::ExecuteMsg::Mint {
                token_id,
                owner,
                token_uri,
                extension,
            };
            Ok(base_contract.execute(deps, env, info, cw721_msg)?)
        }
        ExecuteMsg::TransferNft { recipient, token_id } => {
            let cw721_msg = cw721_base::ExecuteMsg::TransferNft {
                recipient,
                token_id,
            };
            Ok(base_contract.execute(deps, env, info, cw721_msg)?)
        }
        ExecuteMsg::UpdateOwnership(action) => {
            let ownership = update_ownership(deps, &env.block, &info.sender, action)?;
            Ok(Response::new().add_attributes(ownership.into_attributes()))
        },
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
    let base_contract = Cw721Contract::<Extension, Empty, Empty, Empty>::default();
    
    // Get minter using the method and extract the address
    let minter_response = base_contract.minter(deps.as_ref())?;
    
    if info.sender.to_string() != minter_response.minter.unwrap() {
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
    
    // Update the token's extension (extension is TraitExtension, not Option<TraitExtension>)
    base_contract.tokens.update(
        deps.storage,
        &token_id,
        |token| -> StdResult<_> {
            let mut token = token.ok_or_else(|| {
                cosmwasm_std::StdError::not_found(format!("Token {}", token_id))
            })?;
            token.extension = traits.clone();
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
    
    match msg {
        QueryMsg::OwnerOf { token_id, include_expired } => {
            let cw721_msg = cw721_base::QueryMsg::OwnerOf {
                token_id,
                include_expired,
            };
            base_contract.query(deps, env, cw721_msg)
        }
        QueryMsg::NftInfo { token_id } => {
            let cw721_msg = cw721_base::QueryMsg::NftInfo { token_id };
            base_contract.query(deps, env, cw721_msg)
        }
        QueryMsg::Tokens { owner, start_after, limit } => {
            let cw721_msg = cw721_base::QueryMsg::Tokens {
                owner,
                start_after,
                limit,
            };
            base_contract.query(deps, env, cw721_msg)
        }
    }
}

use cosmwasm_std::Empty;

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::from_json;
    use cw721::{Cw721Query, NftInfoResponse, OwnerOfResponse};

    const MINTER: &str = "minter";
    const USER: &str = "user";

    fn setup_contract(deps: DepsMut) -> Result<Response, ContractError> {
        let msg = InstantiateMsg {
            name: "SporeFates".to_string(),
            symbol: "SPORE".to_string(),
            minter: MINTER.to_string(),
        };
        let info = mock_info(MINTER, &[]);
        instantiate(deps, mock_env(), info, msg)
    }

    fn mint_token(deps: DepsMut, token_id: &str, owner: &str) -> Result<Response, ContractError> {
        let msg = ExecuteMsg::Mint {
            token_id: token_id.to_string(),
            owner: owner.to_string(),
            token_uri: None,
            extension: TraitExtension {
                cap: 0,
                stem: 0,
                spores: 0,
                substrate: 0,
            },
        };
        let info = mock_info(MINTER, &[]);
        execute(deps, mock_env(), info, msg)
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let res = setup_contract(deps.as_mut()).unwrap();
        
        assert_eq!(res.messages.len(), 0);
        
        // Query contract info using the method
        let base_contract = Cw721Contract::<Extension, Empty, Empty, Empty>::default();
        let info = base_contract.contract_info(deps.as_ref()).unwrap();
        
        assert_eq!(info.name, "SporeFates");
        assert_eq!(info.symbol, "SPORE");
    }

    #[test]
    fn test_mint_token() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        
        let res = mint_token(deps.as_mut(), "1", USER).unwrap();
        assert_eq!(res.messages.len(), 0);
        
        // Query owner
        let query_msg = QueryMsg::OwnerOf {
            token_id: "1".to_string(),
            include_expired: None,
        };
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let owner: OwnerOfResponse = from_json(&res).unwrap();
        assert_eq!(owner.owner, USER);
    }

    #[test]
    fn test_update_traits_by_minter() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        mint_token(deps.as_mut(), "1", USER).unwrap();
        
        let new_traits = TraitExtension {
            cap: 2,
            stem: -1,
            spores: 3,
            substrate: 1,
        };
        
        let msg = ExecuteMsg::UpdateTraits {
            token_id: "1".to_string(),
            traits: new_traits.clone(),
        };
        let info = mock_info(MINTER, &[]);
        let res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();
        
        assert_eq!(res.attributes.len(), 6);
        assert_eq!(res.attributes[0].value, "update_traits");
        
        // Query updated traits
        let query_msg = QueryMsg::NftInfo {
            token_id: "1".to_string(),
        };
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let nft_info: NftInfoResponse<TraitExtension> = from_json(&res).unwrap();
        
        // extension is TraitExtension, not Option<TraitExtension>
        let traits = nft_info.extension;
        assert_eq!(traits.cap, 2);
        assert_eq!(traits.stem, -1);
        assert_eq!(traits.spores, 3);
        assert_eq!(traits.substrate, 1);
    }

    #[test]
    fn test_update_traits_unauthorized() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        mint_token(deps.as_mut(), "1", USER).unwrap();
        
        let new_traits = TraitExtension {
            cap: 1,
            stem: 1,
            spores: 1,
            substrate: 0,
        };
        
        let msg = ExecuteMsg::UpdateTraits {
            token_id: "1".to_string(),
            traits: new_traits,
        };
        
        // Try to update from non-minter
        let info = mock_info(USER, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        
        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    #[test]
    fn test_invalid_trait_values() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        mint_token(deps.as_mut(), "1", USER).unwrap();
        
        // Test cap out of range
        let invalid_traits = TraitExtension {
            cap: 4, // Invalid: max is 3
            stem: 0,
            spores: 0,
            substrate: 0,
        };
        
        let msg = ExecuteMsg::UpdateTraits {
            token_id: "1".to_string(),
            traits: invalid_traits,
        };
        let info = mock_info(MINTER, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        
        assert!(matches!(err, ContractError::InvalidTrait { .. }));
        
        // Test substrate out of range
        let invalid_traits = TraitExtension {
            cap: 0,
            stem: 0,
            spores: 0,
            substrate: 5, // Invalid: max is 4
        };
        
        let msg = ExecuteMsg::UpdateTraits {
            token_id: "1".to_string(),
            traits: invalid_traits,
        };
        let info = mock_info(MINTER, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        
        assert!(matches!(err, ContractError::InvalidTrait { .. }));
    }

    #[test]
    fn test_transfer_token() {
        let mut deps = mock_dependencies();
        setup_contract(deps.as_mut()).unwrap();
        mint_token(deps.as_mut(), "1", USER).unwrap();
        
        let msg = ExecuteMsg::TransferNft {
            recipient: "new_owner".to_string(),
            token_id: "1".to_string(),
        };
        let info = mock_info(USER, &[]);
        execute(deps.as_mut(), mock_env(), info, msg).unwrap();
        
        // Query new owner
        let query_msg = QueryMsg::OwnerOf {
            token_id: "1".to_string(),
            include_expired: None,
        };
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let owner: OwnerOfResponse = from_json(&res).unwrap();
        assert_eq!(owner.owner, "new_owner");
    }
}
