use cosmwasm_schema::cw_serde;
use cosmwasm_std::CustomMsg;
use cw721::msg::NftExtensionMsg;
use cw721::state::Trait;
use cw_ownable::cw_ownable_execute;

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

#[cw_ownable_execute]
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
    TransferNft {
        recipient: String,
        token_id: String,
    },
}

#[cw_serde]
pub enum QueryMsg {
    OwnerOf {
        token_id: String,
        include_expired: Option<bool>,
    },
    NftInfo {
        token_id: String,
    },
    Tokens {
        owner: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
}
