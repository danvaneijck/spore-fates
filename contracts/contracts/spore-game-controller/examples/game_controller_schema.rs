use std::env::current_dir;
use std::fs::create_dir_all;

use cosmwasm_schema::{export_schema, remove_schemas, schema_for};

use spore_game_controller::msg::{
    ExecuteMsg, InstantiateMsg, PendingRewardsResponse, QueryMsg, TraitExtension, TraitTarget,
};
use spore_game_controller::state::{Config, GlobalState, TokenInfo};

fn main() {
    let mut out_dir = current_dir().unwrap();
    out_dir.push("schema");
    create_dir_all(&out_dir).unwrap();
    remove_schemas(&out_dir).unwrap();

    // 1. Contract Entry Points
    export_schema(&schema_for!(InstantiateMsg), &out_dir);
    export_schema(&schema_for!(ExecuteMsg), &out_dir);
    export_schema(&schema_for!(QueryMsg), &out_dir);

    // 2. Custom Responses & Enums
    export_schema(&schema_for!(PendingRewardsResponse), &out_dir);
    export_schema(&schema_for!(TraitTarget), &out_dir);
    export_schema(&schema_for!(TraitExtension), &out_dir);

    // 3. State Definitions (Useful for indexers/debugging)
    export_schema(&schema_for!(Config), &out_dir);
    export_schema(&schema_for!(GlobalState), &out_dir);
    export_schema(&schema_for!(TokenInfo), &out_dir);
}