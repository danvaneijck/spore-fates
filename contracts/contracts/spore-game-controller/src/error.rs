use cosmwasm_std::{DivideByZeroError, OverflowError, StdError};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Invalid payment")]
    InvalidPayment {},

    #[error("Insufficient funds")]
    InsufficientFunds {},

    #[error("No rewards to claim")]
    NoRewards {},

    #[error("Not at max level")]
    NotMaxLevel {},

    #[error("Has pending spin")]
    HasPendingSpin {},

    #[error("No pending spin")]
    NoPendingSpin {},

    #[error("Claimed")]
    Claimed {},

    #[error("Already at max substrate level")]
    MaxSubstrate {},

    #[error("Already at max substrate level")]
    InvalidParents {},

    #[error("Overflow error: {0}")]
    Overflow(#[from] OverflowError),

    #[error("Divide by zero error: {0}")]
    DivideByZero(#[from] DivideByZeroError),
}
