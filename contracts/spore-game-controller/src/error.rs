use cosmwasm_std::{StdError, OverflowError, DivideByZeroError};
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

    #[error("Already at max substrate level")]
    MaxSubstrate {},

    #[error("Overflow error: {0}")]
    Overflow(#[from] OverflowError),

    #[error("Divide by zero error: {0}")]
    DivideByZero(#[from] DivideByZeroError),
}
