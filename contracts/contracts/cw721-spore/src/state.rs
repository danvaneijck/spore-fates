use cw_storage_plus::Map;

// SVG data stored separately from NftExtension to keep token metadata lightweight.
// This prevents the expensive deserialization of large SVG strings during token enumeration queries.
pub const SVGS: Map<&str, String> = Map::new("svgs");
