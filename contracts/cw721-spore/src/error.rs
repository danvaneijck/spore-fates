use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Invalid trait: {trait_name}")]
    InvalidTrait { trait_name: String },
}

impl From<cw721_base::ContractError> for ContractError {
    fn from(err: cw721_base::ContractError) -> Self {
        match err {
            cw721_base::ContractError::Std(e) => ContractError::Std(e),
            cw721_base::ContractError::Unauthorized {} => ContractError::Unauthorized {},
            _ => ContractError::Std(StdError::generic_err(err.to_string())),
        }
    }
}
