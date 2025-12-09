use cosmwasm_schema::cw_serde;

#[cw_serde]
pub struct GlobalBiomass {
    pub total_base_cap: u128,
    pub total_base_stem: u128,
    pub total_base_spores: u128,
}
