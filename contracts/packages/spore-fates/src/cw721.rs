use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Binary, CustomMsg};
use cw20::Expiration;
use cw721::msg::NftExtensionMsg;
use cw721::state::Trait;
use cw721::Action;

#[cw_serde]
#[derive(Default)]
pub struct TraitExtension {
    // Volatile Stats (-3 to +3)
    pub cap: i8,
    pub stem: i8,
    pub spores: i8,

    pub substrate: u8,

    pub genes: Vec<u8>,
    pub base_cap: u8,
    pub base_stem: u8,
    pub base_spores: u8,
}

// You will also need a helper to calculate Base Stats from Genes
impl TraitExtension {
    pub fn recalculate_base_stats(&mut self) {
        let mut cap_genes = 0;
        let mut stem_genes = 0;
        let mut spores_genes = 0;

        for gene in &self.genes {
            match gene {
                1 => cap_genes += 1,
                2 => stem_genes += 1,
                3 => spores_genes += 1,
                4 => {
                    // Primordial counts for all
                    cap_genes += 1;
                    stem_genes += 1;
                    spores_genes += 1;
                }
                _ => {} // Rot does nothing
            }
        }

        self.base_cap = Self::calc_stat_bonus(cap_genes);
        self.base_stem = Self::calc_stat_bonus(stem_genes);
        self.base_spores = Self::calc_stat_bonus(spores_genes);
    }

    fn calc_stat_bonus(count: u8) -> u8 {
        match count {
            0..=2 => 0,
            3..=4 => 1,
            5..=6 => 3,
            7 => 6,
            _ => 10, // 8 or more
        }
    }
}

impl CustomMsg for TraitExtension {}

impl From<TraitExtension> for Vec<Trait> {
    fn from(t: TraitExtension) -> Self {
        // Convert genes vector to a string representation like "[1, 2, 0...]"
        let gene_string = format!("{:?}", t.genes);

        vec![
            // Volatile Stats
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
            // New Base Stats (Immutable)
            Trait {
                display_type: None,
                trait_type: "base_cap".to_string(),
                value: t.base_cap.to_string(),
            },
            Trait {
                display_type: None,
                trait_type: "base_stem".to_string(),
                value: t.base_stem.to_string(),
            },
            Trait {
                display_type: None,
                trait_type: "base_spores".to_string(),
                value: t.base_spores.to_string(),
            },
            Trait {
                display_type: None,
                trait_type: "genome".to_string(),
                value: gene_string,
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
