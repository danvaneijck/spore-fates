use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum ContractError {
    #[error("Invalid signature: {msg}")]
    InvalidSignature { msg: String },

    #[error("Invalid randomness")]
    InvalidRandomness,

    #[error(transparent)]
    Std(#[from] StdError),
}
