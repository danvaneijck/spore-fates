use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Binary, CustomMsg};
use cw721::msg::NftExtensionMsg;
use cw721::state::Trait;
use cw721::{Action, Expiration};

#[cw_serde]
pub struct InstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub minter: String,
}

#[cw_serde]
pub struct TraitExtension {
    pub cap: i8,
    pub stem: i8,
    pub spores: i8,
    pub substrate: u8,
}

impl CustomMsg for TraitExtension {}

// Helper to convert your Game Traits -> OpenSea Standard Traits
impl From<TraitExtension> for Vec<Trait> {
    fn from(t: TraitExtension) -> Self {
        vec![
            Trait {
                display_type: None,
                trait_type: "cap".to_string(),
                value: t.cap.to_string(),
            },
            Trait {
                display_type: None,
                trait_type: "stem".to_string(),
                value: t.stem.to_string(),
            },
            Trait {
                display_type: None,
                trait_type: "spores".to_string(),
                value: t.spores.to_string(),
            },
            Trait {
                display_type: None,
                trait_type: "substrate".to_string(),
                value: t.substrate.to_string(),
            },
        ]
    }
}

// Conversion for the Mint message
impl From<TraitExtension> for NftExtensionMsg {
    fn from(t: TraitExtension) -> Self {
        NftExtensionMsg {
            image: None,
            image_data: None,
            external_url: None,
            description: Some("SporeFate Game Item".to_string()),
            name: None,
            attributes: Some(t.into()), // Uses the implementation above
            background_color: None,
            animation_url: None,
            youtube_url: None,
        }
    }
}

#[cw_serde]
pub enum ExecuteMsg {
    UpdateTraits {
        token_id: String,
        traits: TraitExtension,
    },
    Mint {
        token_id: String,
        owner: String,
        token_uri: Option<String>,
        extension: TraitExtension,
    },

    // --- STANDARD CW721 EXECUTE MESSAGES ---
    TransferNft {
        recipient: String,
        token_id: String,
    },
    SendNft {
        contract: String,
        token_id: String,
        msg: Binary,
    },
    Approve {
        spender: String,
        token_id: String,
        expires: Option<Expiration>,
    },
    Revoke {
        spender: String,
        token_id: String,
    },
    ApproveAll {
        operator: String,
        expires: Option<Expiration>,
    },
    RevokeAll {
        operator: String,
    },
    Burn {
        token_id: String,
    },
    UpdateMinterOwnership(Action),
    UpdateCreatorOwnership(Action),
}

#[cw_serde]
pub enum QueryMsg {
    // --- STANDARD CW721 QUERY MESSAGES ---
    OwnerOf {
        token_id: String,
        include_expired: Option<bool>,
    },
    Approval {
        token_id: String,
        spender: String,
        include_expired: Option<bool>,
    },
    Approvals {
        token_id: String,
        include_expired: Option<bool>,
    },
    Operator {
        owner: String,
        operator: String,
        include_expired: Option<bool>,
    },
    AllOperators {
        owner: String,
        include_expired: Option<bool>,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    NumTokens {},
    GetCollectionInfoAndExtension {},
    NftInfo {
        token_id: String,
    },
    AllNftInfo {
        token_id: String,
        include_expired: Option<bool>,
    },
    Tokens {
        owner: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    AllTokens {
        start_after: Option<String>,
        limit: Option<u32>,
    },
    Minter {},
}
