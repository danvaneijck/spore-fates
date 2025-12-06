use cosmwasm_schema::cw_serde;
use cw721_base::{ExecuteMsg as Cw721ExecuteMsg, QueryMsg as Cw721QueryMsg};

#[cw_serde]
pub struct InstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub minter: String,
}

#[cw_serde]
pub struct TraitExtension {
    pub cap: i8,       // -3 to +3
    pub stem: i8,      // -3 to +3
    pub spores: i8,    // -3 to +3
    pub substrate: u8, // 0 to 4 (Prestige, never resets)
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Update traits - only callable by game controller
    UpdateTraits {
        token_id: String,
        traits: TraitExtension,
    },
    /// Standard CW721 Mint
    Mint {
        token_id: String,
        owner: String,
        token_uri: Option<String>,
        extension: TraitExtension,
    },
    /// Standard CW721 TransferNft
    TransferNft {
        recipient: String,
        token_id: String,
    },
}

#[cw_serde]
pub enum QueryMsg {
    /// Standard CW721 OwnerOf
    OwnerOf {
        token_id: String,
        include_expired: Option<bool>,
    },
    /// Standard CW721 NftInfo
    NftInfo {
        token_id: String,
    },
}
