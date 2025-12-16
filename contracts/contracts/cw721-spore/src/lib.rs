use cosmwasm_std::{entry_point, Binary, Deps, DepsMut, Env, MessageInfo, Response};
use cw721::msg::NftExtensionMsg;
use cw721_base::traits::{Cw721Execute, Cw721Query};
use cw721_metadata_onchain::Cw721MetadataContract;
use spore_fates::cw721::{ExecuteMsg, TraitExtension};

pub mod error;
pub mod msg;
pub mod state;

use crate::error::ContractError;
use crate::msg::{InstantiateMsg, QueryMsg};

pub type Extension = TraitExtension;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let base_contract = Cw721MetadataContract::default();

    let res = base_contract.instantiate(
        deps,
        &env,
        &info,
        cw721_base::msg::InstantiateMsg {
            name: msg.name,
            symbol: msg.symbol,
            minter: Some(msg.minter),
            collection_info_extension: None,
            creator: None,
            withdraw_address: None,
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
    let base_contract = Cw721MetadataContract::default();

    match msg {
        ExecuteMsg::UpdateTraits { token_id, traits } => {
            execute_update_traits(deps, env, info, token_id, traits)
        }
        ExecuteMsg::Mint {
            token_id,
            owner,
            token_uri,
            extension,
        } => {
            let standard_ext: NftExtensionMsg = extension.into();

            let cw721_msg = cw721_metadata_onchain::msg::ExecuteMsg::Mint {
                token_id,
                owner,
                token_uri,
                extension: Some(standard_ext),
            };
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }
        // --- STANDARD CW721 LOGIC (Delegated) ---
        ExecuteMsg::TransferNft {
            recipient,
            token_id,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::ExecuteMsg::TransferNft {
                recipient,
                token_id,
            };
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }
        ExecuteMsg::SendNft {
            contract,
            token_id,
            msg,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::ExecuteMsg::SendNft {
                contract,
                token_id,
                msg,
            };
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }
        ExecuteMsg::Approve {
            spender,
            token_id,
            expires,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::ExecuteMsg::Approve {
                spender,
                token_id,
                expires,
            };
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }
        ExecuteMsg::Revoke { spender, token_id } => {
            let cw721_msg = cw721_metadata_onchain::msg::ExecuteMsg::Revoke { spender, token_id };
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }
        ExecuteMsg::ApproveAll { operator, expires } => {
            let cw721_msg =
                cw721_metadata_onchain::msg::ExecuteMsg::ApproveAll { operator, expires };
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }
        ExecuteMsg::RevokeAll { operator } => {
            let cw721_msg = cw721_metadata_onchain::msg::ExecuteMsg::RevokeAll { operator };
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }
        ExecuteMsg::Burn { token_id } => {
            // Only minter can burn
            let minter = base_contract.query_minter_ownership(deps.storage)?;

            if info.sender.to_string() != minter.owner.unwrap().to_string() {
                return Err(ContractError::Unauthorized {});
            }

            let cw721_msg = cw721_metadata_onchain::msg::ExecuteMsg::Burn { token_id };
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }

        ExecuteMsg::UpdateMinterOwnership(action) => {
            let cw721_msg = cw721_metadata_onchain::msg::ExecuteMsg::UpdateMinterOwnership(action);
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }
        ExecuteMsg::UpdateCreatorOwnership(action) => {
            let cw721_msg = cw721_metadata_onchain::msg::ExecuteMsg::UpdateCreatorOwnership(action);
            Ok(base_contract.execute(deps, &env, &info, cw721_msg)?)
        }
    }
}

/// Only the game controller can update traits
fn execute_update_traits(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
    traits: TraitExtension,
) -> Result<Response, ContractError> {
    let base_contract = Cw721MetadataContract::default();

    // Get minter using the method and extract the address
    let minter_response = base_contract.query_minter_ownership(deps.storage)?;

    // cw-ownable uses `owner`, which is Option<Addr>
    if info.sender.to_string() != minter_response.owner.unwrap().to_string() {
        return Err(ContractError::Unauthorized {});
    }

    // Validate trait ranges
    if traits.cap < -3 || traits.cap > 3 {
        return Err(ContractError::InvalidTrait {
            trait_name: "cap".to_string(),
        });
    }
    if traits.stem < -3 || traits.stem > 3 {
        return Err(ContractError::InvalidTrait {
            trait_name: "stem".to_string(),
        });
    }
    if traits.spores < -3 || traits.spores > 3 {
        return Err(ContractError::InvalidTrait {
            trait_name: "spores".to_string(),
        });
    }
    if traits.substrate > 4 {
        return Err(ContractError::InvalidTrait {
            trait_name: "substrate".to_string(),
        });
    }

    let token_info = base_contract.query_nft_info(deps.as_ref().storage, token_id.clone())?;

    // If extension is null, we create a default one
    let mut current_extension = token_info.extension.unwrap_or_default();

    // Overwrite the attributes with the new ones from your TraitExtension
    current_extension.attributes = Some(traits.clone().into());

    let extension_msg: NftExtensionMsg = current_extension.into();

    let update_msg = cw721_metadata_onchain::msg::ExecuteMsg::UpdateNftInfo {
        token_id: token_id.clone(),
        token_uri: token_info.token_uri,
        extension: Some(extension_msg),
    };

    base_contract.execute(deps, &env, &info, update_msg)?;

    Ok(Response::new()
        .add_attribute("action", "update_traits")
        .add_attribute("token_id", token_id)
        .add_attribute("cap", traits.cap.to_string())
        .add_attribute("stem", traits.stem.to_string())
        .add_attribute("spores", traits.spores.to_string())
        .add_attribute("substrate", traits.substrate.to_string()))
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> Result<Binary, ContractError> {
    let base_contract = Cw721MetadataContract::default();

    // Helper macro or manual mapping to standard query messages
    match msg {
        QueryMsg::OwnerOf {
            token_id,
            include_expired,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::OwnerOf {
                token_id,
                include_expired,
            };
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::Approval {
            token_id,
            spender,
            include_expired,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::Approval {
                token_id,
                spender,
                include_expired,
            };
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::Approvals {
            token_id,
            include_expired,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::Approvals {
                token_id,
                include_expired,
            };
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::Operator {
            owner,
            operator,
            include_expired,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::Operator {
                owner,
                operator,
                include_expired,
            };
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::AllOperators {
            owner,
            include_expired,
            start_after,
            limit,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::AllOperators {
                owner,
                include_expired,
                start_after,
                limit,
            };
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::NumTokens {} => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::NumTokens {};
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::NftInfo { token_id } => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::NftInfo { token_id };
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::AllNftInfo {
            token_id,
            include_expired,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::AllNftInfo {
                token_id,
                include_expired,
            };
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::Tokens {
            owner,
            start_after,
            limit,
        } => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::Tokens {
                owner,
                start_after,
                limit,
            };
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::AllTokens { start_after, limit } => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::AllTokens { start_after, limit };
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::Minter {} => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::GetMinterOwnership {};
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
        QueryMsg::GetCollectionInfoAndExtension {} => {
            let cw721_msg = cw721_metadata_onchain::msg::QueryMsg::GetCollectionInfoAndExtension {};
            Ok(base_contract.query(deps, &env, cw721_msg)?)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{message_info, mock_dependencies, mock_env};
    use cosmwasm_std::{from_json, Addr};
    use cw721::msg::{NftInfoResponse, OwnerOfResponse};
    use cw721::traits::Cw721Query;

    fn setup_contract(deps: DepsMut, minter: &Addr) -> Result<Response, ContractError> {
        let msg = InstantiateMsg {
            name: "SporeFates".to_string(),
            symbol: "SPORE".to_string(),
            minter: minter.to_string(),
        };
        let info = message_info(minter, &[]);
        instantiate(deps, mock_env(), info, msg)
    }

    fn mint_token(
        deps: DepsMut,
        minter: &Addr,
        token_id: &str,
        owner: &Addr,
    ) -> Result<Response, ContractError> {
        let msg = ExecuteMsg::Mint {
            token_id: token_id.to_string(),
            owner: owner.to_string(),
            token_uri: None,
            extension: TraitExtension {
                cap: 0,
                stem: 0,
                spores: 0,
                substrate: 0,
                genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
                base_cap: 0,
                base_stem: 0,
                base_spores: 0,
            },
        };
        // Minter must sign mint message
        let info = message_info(minter, &[]);
        execute(deps, mock_env(), info, msg)
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let minter = deps.api.addr_make("minter");

        let res = setup_contract(deps.as_mut(), &minter).unwrap();

        assert_eq!(res.messages.len(), 0);

        let base_contract = Cw721MetadataContract::default();
        let info = base_contract.query_collection_info(deps.as_ref()).unwrap();

        assert_eq!(info.name, "SporeFates");
        assert_eq!(info.symbol, "SPORE");
    }

    #[test]
    fn test_mint_token() {
        let mut deps = mock_dependencies();
        let minter = deps.api.addr_make("minter");
        let user = deps.api.addr_make("user");

        setup_contract(deps.as_mut(), &minter).unwrap();

        let res = mint_token(deps.as_mut(), &minter, "1", &user).unwrap();
        assert_eq!(res.messages.len(), 0);

        // Query owner
        let query_msg = QueryMsg::OwnerOf {
            token_id: "1".to_string(),
            include_expired: None,
        };
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let owner: OwnerOfResponse = from_json(&res).unwrap();
        assert_eq!(owner.owner, user.to_string());
    }

    #[test]
    fn test_update_traits_by_minter() {
        let mut deps = mock_dependencies();
        let minter = deps.api.addr_make("minter");
        let user = deps.api.addr_make("user");

        setup_contract(deps.as_mut(), &minter).unwrap();
        mint_token(deps.as_mut(), &minter, "1", &user).unwrap();

        let new_traits = TraitExtension {
            cap: 2,
            stem: -1,
            spores: 3,
            substrate: 1,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };

        let msg = ExecuteMsg::UpdateTraits {
            token_id: "1".to_string(),
            traits: new_traits.clone(),
        };

        // Minter sends the update
        let info = message_info(&minter, &[]);
        let res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        assert_eq!(res.attributes.len(), 6);
        assert_eq!(res.attributes[0].value, "update_traits");

        // Query updated traits
        let query_msg = QueryMsg::NftInfo {
            token_id: "1".to_string(),
        };
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();

        let nft_info: NftInfoResponse<cw721_base::NftExtension> = from_json(&res).unwrap();

        let extension = nft_info.extension;
        let attributes = extension.attributes.expect("Attributes should be present");

        // Helper to find value by trait_type
        let get_trait_val = |key: &str| -> String {
            attributes
                .iter()
                .find(|t| t.trait_type == key)
                .map(|t| t.value.clone())
                .unwrap_or_default()
        };

        // Strings are compared because Trait value is always stored as String in standard metadata
        assert_eq!(get_trait_val("cap"), "2");
        assert_eq!(get_trait_val("stem"), "-1");
        assert_eq!(get_trait_val("spores"), "3");
        assert_eq!(get_trait_val("substrate"), "1");
    }

    #[test]
    fn test_update_traits_unauthorized() {
        let mut deps = mock_dependencies();
        let minter = deps.api.addr_make("minter");
        let user = deps.api.addr_make("user");

        setup_contract(deps.as_mut(), &minter).unwrap();
        mint_token(deps.as_mut(), &minter, "1", &user).unwrap();

        let new_traits = TraitExtension {
            cap: 1,
            stem: 1,
            spores: 1,
            substrate: 0,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };

        let msg = ExecuteMsg::UpdateTraits {
            token_id: "1".to_string(),
            traits: new_traits,
        };

        // Try to update from non-minter (user)
        let info = message_info(&user, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();

        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    #[test]
    fn test_invalid_trait_values() {
        let mut deps = mock_dependencies();
        let minter = deps.api.addr_make("minter");
        let user = deps.api.addr_make("user");

        setup_contract(deps.as_mut(), &minter).unwrap();
        mint_token(deps.as_mut(), &minter, "1", &user).unwrap();

        // Test cap out of range
        let invalid_traits = TraitExtension {
            cap: 4, // Invalid: max is 3
            stem: 0,
            spores: 0,
            substrate: 0,
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };

        let msg = ExecuteMsg::UpdateTraits {
            token_id: "1".to_string(),
            traits: invalid_traits,
        };
        let info = message_info(&minter, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();

        assert!(matches!(err, ContractError::InvalidTrait { .. }));

        // Test substrate out of range
        let invalid_traits = TraitExtension {
            cap: 0,
            stem: 0,
            spores: 0,
            substrate: 5, // Invalid: max is 4
            genes: vec![0, 0, 0, 0, 0, 0, 0, 0],
            base_cap: 0,
            base_stem: 0,
            base_spores: 0,
        };

        let msg = ExecuteMsg::UpdateTraits {
            token_id: "1".to_string(),
            traits: invalid_traits,
        };
        let info = message_info(&minter, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();

        assert!(matches!(err, ContractError::InvalidTrait { .. }));
    }

    #[test]
    fn test_transfer_token() {
        let mut deps = mock_dependencies();
        let minter = deps.api.addr_make("minter");
        let user = deps.api.addr_make("user");
        let new_owner = deps.api.addr_make("new_owner");

        setup_contract(deps.as_mut(), &minter).unwrap();
        mint_token(deps.as_mut(), &minter, "1", &user).unwrap();

        let msg = ExecuteMsg::TransferNft {
            recipient: new_owner.to_string(),
            token_id: "1".to_string(),
        };
        // User (current owner) initiates transfer
        let info = message_info(&user, &[]);
        execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Query new owner
        let query_msg = QueryMsg::OwnerOf {
            token_id: "1".to_string(),
            include_expired: None,
        };
        let res = query(deps.as_ref(), mock_env(), query_msg).unwrap();
        let owner: OwnerOfResponse = from_json(&res).unwrap();
        assert_eq!(owner.owner, new_owner.to_string());
    }
}
