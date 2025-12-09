use std::env::current_dir;
use std::fs::create_dir_all;

use cosmwasm_schema::{export_schema, remove_schemas, schema_for};

use cw721_spore::msg::{InstantiateMsg, QueryMsg};

// We import standard CW721 responses to help frontend generation
use cw721::msg::{
    AllNftInfoResponse, MinterResponse, NftExtensionMsg, NftInfoResponse, NumTokensResponse,
    OwnerOfResponse, TokensResponse,
};
use spore_fates::cw721::{ExecuteMsg, TraitExtension};

fn main() {
    let mut out_dir = current_dir().unwrap();
    out_dir.push("schema");
    create_dir_all(&out_dir).unwrap();
    remove_schemas(&out_dir).unwrap();

    // 1. Contract Entry Points
    export_schema(&schema_for!(InstantiateMsg), &out_dir);
    export_schema(&schema_for!(ExecuteMsg), &out_dir);
    export_schema(&schema_for!(QueryMsg), &out_dir);

    // 2. Custom Structures
    export_schema(&schema_for!(TraitExtension), &out_dir);

    // 3. Standard CW721 Responses
    // Note: We specify <NftExtensionMsg> because your contract uses Cw721MetadataContract
    export_schema(&schema_for!(NftInfoResponse<NftExtensionMsg>), &out_dir);
    export_schema(&schema_for!(AllNftInfoResponse<NftExtensionMsg>), &out_dir);
    export_schema(&schema_for!(OwnerOfResponse), &out_dir);
    export_schema(&schema_for!(TokensResponse), &out_dir);
    export_schema(&schema_for!(MinterResponse), &out_dir);
    export_schema(&schema_for!(NumTokensResponse), &out_dir);
    // export_schema(&schema_for!(ContractInfoResponse), &out_dir);

    // // 4. Metadata specific responses
    // export_schema(
    //     &schema_for!(CollectionInfoResponse<cw721::msg::CollectionExtension>),
    //     &out_dir,
    // );
}
