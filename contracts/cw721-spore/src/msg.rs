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
    /// All standard CW721 messages
    #[serde(flatten)]
    Cw721(Cw721ExecuteMsg<TraitExtension, cosmwasm_std::Empty>),
}

impl From<ExecuteMsg> for Cw721ExecuteMsg<TraitExtension, cosmwasm_std::Empty> {
    fn from(msg: ExecuteMsg) -> Self {
        match msg {
            ExecuteMsg::Cw721(cw721_msg) => cw721_msg,
            _ => panic!("Cannot convert UpdateTraits to Cw721ExecuteMsg"),
        }
    }
}

#[cw_serde]
pub enum QueryMsg {
    #[serde(flatten)]
    Cw721(Cw721QueryMsg<cosmwasm_std::Empty>),
}

impl From<QueryMsg> for Cw721QueryMsg<cosmwasm_std::Empty> {
    fn from(msg: QueryMsg) -> Self {
        match msg {
            QueryMsg::Cw721(cw721_msg) => cw721_msg,
        }
    }
}
