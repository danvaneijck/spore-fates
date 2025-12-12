use base64::engine::general_purpose;
use base64::Engine;
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

    pub fn generate_svg(&self) -> String {
        // 1. Color Mappings
        let gene_colors = [
            "#6b7280", // 0: Rot
            "#ef4444", // 1: Toxin
            "#10b981", // 2: Chitin
            "#3b82f6", // 3: Phosphor
            "#facc15", // 4: Primordial
        ];

        let substrate_colors = [
            "#9E7FFF", // 0: Magic
            "#38bdf8", // 1: Water
            "#10b981", // 2: Nature
            "#f59e0b", // 3: Earth
            "#ef4444", // 4: Fire
        ];

        let glow_color = substrate_colors
            .get(self.substrate as usize)
            .unwrap_or(&substrate_colors[0]);

        // 2. Geometry Math
        let cap_size = 100 + (self.cap as i16 * 15);
        let stem_height = 80 + (self.stem as i16 * 10);

        let stem_y = 200 - stem_height;
        let cap_y = 200 - stem_height;
        let cap_rx = cap_size / 2;
        let cap_ry = cap_size / 3;

        // Spot Calculations
        let spot_rx = cap_rx / 5;
        let spot_ry = cap_ry / 4;

        let s1_x = 150 - (cap_rx / 2);
        let s1_y = cap_y + (cap_ry / 5);

        let s2_x = 150 + (cap_rx / 2) - 10;
        let s2_y = cap_y;

        let s3_x = 150 - 10;
        let s3_y = cap_y - (cap_ry / 2) + 5;

        // 3. Orbs Logic
        let orb_positions = [
            (230, 150),
            (206, 206),
            (150, 230),
            (93, 206),
            (70, 150),
            (93, 93),
            (150, 70),
            (206, 93),
        ];

        let mut orbs_svg = String::new();
        for i in 0..8 {
            let gene_type = if i < self.genes.len() {
                self.genes[i]
            } else {
                0
            };
            let (bx, by) = orb_positions[i];
            let color = gene_colors
                .get(gene_type as usize)
                .unwrap_or(&gene_colors[0]);

            let delay = i as f32 * -0.5;
            let anim_name = if i % 2 == 0 {
                "drift-wide"
            } else {
                "drift-vertical"
            };
            let size = if gene_type == 0 { 3 } else { 5 }; // Standardized sizes

            let filter = if gene_type != 0 {
                "filter=\"url(#glow)\""
            } else {
                ""
            };

            orbs_svg.push_str(&format!(
                r##"<g style="animation: {} {}s ease-in-out infinite; animation-delay: {}s">
                    <circle cx="{}" cy="{}" r="{}" fill="{}" {} 
                        style="animation: fade-breath {}s ease-in-out infinite; animation-delay: {}s" />
                </g>"##,
                anim_name, 4 + (i % 3), delay,
                bx, by, size, color, filter,
                2 + (i % 2), delay
            ));
        }

        // 4. Substrate Dots
        let mut substrate_dots = String::new();
        for i in 0..5 {
            let cx = -40 + i * 20;
            let fill = if i < self.substrate as i32 {
                glow_color
            } else {
                "#333"
            };
            let op = if i < self.substrate as i32 {
                "1"
            } else {
                "0.2"
            };
            substrate_dots.push_str(&format!(
                r##"<circle cx="{}" cy="0" r="3" fill="{}" opacity="{}" />"##,
                cx, fill, op
            ));
        }

        // 5. Final Assembly
        format!(
            r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" style="background-color: #1a1a1a;">
                <style>
                    @keyframes float {{ 0%, 100% {{ transform: translateY(0px); }} 50% {{ transform: translateY(-5px); }} }}
                    @keyframes drift-wide {{ 0% {{ transform: translate(0, 0); }} 50% {{ transform: translate(5px, 15px); }} 100% {{ transform: translate(0, 0); }} }}
                    @keyframes drift-vertical {{ 0% {{ transform: translate(0, 0); }} 50% {{ transform: translate(10px, -5px); }} 100% {{ transform: translate(0, 0); }} }}
                    @keyframes fade-breath {{ 0%, 100% {{ opacity: 0.4; }} 50% {{ opacity: 1; }} }}
                </style>
                <defs>
                    <!-- Organic Texture Filter -->
                    <filter id="noise" x="0%" y="0%" width="100%" height="100%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise"/>
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" in="noise" result="coloredNoise"/>
                        <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite"/>
                        <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
                    </filter>
                    
                    <!-- Glow Filter -->
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>

                    <!-- Cap Gradient (FULLY OPAQUE to cover stem) -->
                    <radialGradient id="capGrad" cx="50%" cy="40%" r="80%" fx="50%" fy="30%">
                        <stop offset="0%" stop-color="{}" stop-opacity="1" />
                        <stop offset="100%" stop-color="#111" stop-opacity="1" /> 
                    </radialGradient>
                </defs>

                <!-- Background Aura (Substrate Color) -->
                <circle cx="150" cy="150" r="120" fill="{}" filter="url(#glow)" opacity="0.1" />

                <!-- Floating Group -->
                <g style="animation: float 6s ease-in-out infinite;">
                    
                    <!-- Stem (Drawn first) -->
                    <rect x="135" y="{}" width="30" height="{}" fill="#E5E7EB" rx="15" />
                    <path d="M 135 {} Q 150 {} 165 {}" fill="none" stroke="#D1D5DB" stroke-width="2" />

                    <!-- Cap Layer 1: Base Gradient (Opaque) -->
                    <ellipse cx="150" cy="{}" rx="{}" ry="{}" fill="url(#capGrad)" />

                    <!-- Cap Layer 2: Texture Overlay -->
                    <ellipse cx="150" cy="{}" rx="{}" ry="{}" fill="#000" filter="url(#noise)" opacity="0.4" style="mix-blend-mode: overlay;" />
                    
                    <!-- Cap Layer 3: Spots -->
                    <g fill="#FFF" opacity="0.15">
                        <ellipse cx="{}" cy="{}" rx="{}" ry="{}" />
                        <ellipse cx="{}" cy="{}" rx="{}" ry="{}" />
                        <ellipse cx="{}" cy="{}" rx="{}" ry="{}" />
                    </g>

                    <!-- Cap Layer 4: Rim Light -->
                    <ellipse cx="150" cy="{}" rx="{}" ry="{}" fill="none" stroke="white" stroke-opacity="0.2" stroke-width="1.5" />

                    <!-- Orbs -->
                    {}

                    <!-- Stats Dots -->
                    <g transform="translate(150, 240)">{}</g>
                </g>
            </svg>"##,
            // Colors
            glow_color, // Cap Gradient Start
            glow_color, // Background Aura
            // Stem
            stem_y,
            stem_height,
            stem_y + 10,
            stem_y + 10,
            stem_y + 10, // Stem Curve
            // Cap Base & Texture
            cap_y,
            cap_rx,
            cap_ry,
            cap_y,
            cap_rx,
            cap_ry,
            // Spots
            s1_x,
            s1_y,
            spot_rx,
            spot_ry,
            s2_x,
            s2_y,
            spot_rx,
            spot_ry,
            s3_x,
            s3_y,
            spot_rx,
            spot_ry,
            // Rim Light
            cap_y - 2,
            cap_rx - 2,
            cap_ry - 2,
            // Injections
            orbs_svg,
            substrate_dots
        )
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

impl From<TraitExtension> for NftExtensionMsg {
    fn from(mut t: TraitExtension) -> Self {
        t.recalculate_base_stats();
        let svg_data = t.generate_svg();
        let b64_encoded = general_purpose::STANDARD.encode(&svg_data);
        let image_uri = format!("data:image/svg+xml;base64,{}", b64_encoded);

        NftExtensionMsg {
            image_data: Some(svg_data),
            external_url: Some("https://spore-fates.vercel.app/".to_string()),
            description: Some(
                "A generated SporeFate Mushroom. Stats and appearance mutate on-chain.".to_string(),
            ),
            name: Some("SporeFate Specimen".to_string()),
            attributes: Some(t.into()),
            background_color: Some("1a1a1a".to_string()),
            image: Some(image_uri),
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
