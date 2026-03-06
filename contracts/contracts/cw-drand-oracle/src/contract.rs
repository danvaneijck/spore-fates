#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdError, StdResult,
};

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::BEACONS;

// version info for migration info
const CONTRACT_NAME: &str = "crates.io:drand-oracle";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    cw2::set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::default())
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::AddBeacon {
            round,
            signature,
            randomness,
        } => execute::add_beacon(deps, round, signature, randomness),
        ExecuteMsg::NextBeacon => execute::next_beacon(deps, env, info),
    }
}

pub mod verify {
    use drand_verify::Pubkey;
    use sha2::{Digest, Sha256};

    /// Quicknet public key (G2, 96 bytes) — hex encoded.
    /// Network: drand quicknet (bls-unchained-g1-rfc9380)
    pub const QUICKNET_PK_HEX: &str = "83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a";

    /// Verify a quicknet drand beacon and derive randomness.
    /// Returns 32-byte randomness = sha256(signature) on success.
    pub fn verify_quicknet_beacon(
        round: u64,
        signature: &[u8],
    ) -> Result<[u8; 32], String> {
        let pk_bytes =
            hex::decode(QUICKNET_PK_HEX).map_err(|e| format!("bad pubkey hex: {}", e))?;
        let pk_fixed: [u8; 96] = pk_bytes
            .try_into()
            .map_err(|_| "invalid pubkey length".to_string())?;

        let pk = drand_verify::G2PubkeyRfc::from_fixed(pk_fixed)
            .map_err(|e| format!("invalid pubkey: {:?}", e))?;

        // Quicknet is unchained: previous_signature is empty
        let is_valid = pk
            .verify(round, &[], signature)
            .map_err(|e| format!("verification failed: {:?}", e))?;

        if !is_valid {
            return Err("invalid BLS signature".to_string());
        }

        let randomness: [u8; 32] = Sha256::digest(signature).into();
        Ok(randomness)
    }
}

pub mod execute {
    use crate::{
        msg::ConcreteBeacon,
        state::{Randomness, DELIVERY_QUEUES},
    };
    use cosmwasm_std::{HexBinary, SubMsg, Timestamp, Uint64, WasmMsg};

    use super::*;

    const GENESIS: Timestamp = Timestamp::from_seconds(1692803367);
    const PERIOD_IN_NS: u64 = 3_000_000_000;

    const GAS_LIMIT: u64 = 10_000_000;

    fn next_round(now: Timestamp) -> u64 {
        if now < GENESIS {
            1
        } else {
            let from_genesis = now.nanos() - GENESIS.nanos();
            let periods_since_genesis = from_genesis / PERIOD_IN_NS;
            periods_since_genesis + 1 + 1 // Second addition to convert to 1-based counting
        }
    }

    pub fn add_beacon(
        deps: DepsMut,
        round: Uint64,
        signature: HexBinary,
        randomness: HexBinary,
    ) -> Result<Response, ContractError> {
        if BEACONS.has(deps.storage, round.u64()) {
            return Ok(Response::new()
                .add_attribute("action", "add_beacon")
                .add_attribute("round", round)
                .add_attribute("status", "already_processed"));
        }

        // Verify the BLS signature using drand-verify
        let verified_randomness = verify::verify_quicknet_beacon(round.u64(), &signature)
            .map_err(|e| ContractError::InvalidSignature { msg: e })?;

        // Verify submitted randomness matches the derived value
        if verified_randomness[..] != randomness[..] {
            return Err(ContractError::InvalidRandomness);
        }

        // Store the randomness beacon
        BEACONS.save(
            deps.storage,
            round.u64(),
            &Randomness {
                uniform_seed: verified_randomness,
            },
        )?;

        let mut response: Response = Response::new();

        // Load from the job queue and send the beacon to all receivers
        if let Some(queue) = DELIVERY_QUEUES.may_load(deps.storage, round.u64())? {
            for receiver in queue.receivers {
                response = response.add_submessage(
                    SubMsg::new(WasmMsg::Execute {
                        contract_addr: receiver.into(),
                        msg: cosmwasm_std::to_json_binary(&ConcreteBeacon {
                            round,
                            uniform_seed: verified_randomness,
                        })?,
                        funds: vec![],
                    })
                    .with_gas_limit(GAS_LIMIT),
                );
            }
        }

        // Delete the job queue
        DELIVERY_QUEUES.remove(deps.storage, round.u64());

        Ok(Response::default())
    }

    pub fn next_beacon(
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
    ) -> Result<Response, ContractError> {
        let next_round = next_round(env.block.time);
        let mut queue = DELIVERY_QUEUES
            .may_load(deps.storage, next_round)?
            .unwrap_or_default();
        queue.receivers.insert(info.sender);

        DELIVERY_QUEUES.save(deps.storage, next_round, &queue)?;

        Ok(Response::default())
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Beacon { round } => to_json_binary(&query::beacon(deps, round)?),
        QueryMsg::LatestBeacon {} => to_json_binary(&query::latest_beacon(deps)?),
    }
}

pub mod query {
    use crate::msg::{BeaconResponse, ConcreteBeacon};

    use super::*;
    use cosmwasm_std::Uint64;

    pub fn beacon(deps: Deps, round: Uint64) -> StdResult<BeaconResponse> {
        BEACONS
            .load(deps.storage, round.u64())
            .map(|beacon| BeaconResponse {
                uniform_seed: beacon.uniform_seed,
            })
    }

    pub fn latest_beacon(deps: Deps) -> StdResult<ConcreteBeacon> {
        BEACONS
            .last(deps.storage)
            .transpose()
            .ok_or_else(|| StdError::not_found("no known beacons"))?
            .map(|(round, beacon)| ConcreteBeacon {
                round: round.into(),
                uniform_seed: beacon.uniform_seed,
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::msg::{BeaconResponse, ConcreteBeacon};
    use cosmwasm_std::{
        from_json,
        testing::{mock_dependencies, mock_env},
        Addr, HexBinary, Uint64,
    };
    use sha2::{Digest, Sha256};

    // Real quicknet test vector (round 1000)
    const ROUND: u64 = 1000;
    const SIGNATURE_HEX: &str = "b44679b9a59af2ec876b1a6b1ad52ea9b1615fc3982b19576350f93447cb1125e342b73a8dd2bacbe47e4b6b63ed5e39";
    const RANDOMNESS_HEX: &str = "fe290beca10872ef2fb164d2aa4442de4566183ec51c56ff3cd603d930e54fdd";

    fn signature_bytes() -> Vec<u8> {
        hex::decode(SIGNATURE_HEX).unwrap()
    }

    fn randomness_bytes() -> Vec<u8> {
        hex::decode(RANDOMNESS_HEX).unwrap()
    }

    fn add_beacon_msg() -> ExecuteMsg {
        ExecuteMsg::AddBeacon {
            round: Uint64::new(ROUND),
            signature: HexBinary::from(signature_bytes()),
            randomness: HexBinary::from(randomness_bytes()),
        }
    }

    fn message_info() -> MessageInfo {
        cosmwasm_std::testing::message_info(&Addr::unchecked("anyone"), &[])
    }

    #[test]
    fn verify_test_vector_consistency() {
        // Verify that sha256(signature) == randomness for our test vector
        let sig = signature_bytes();
        let expected_randomness = randomness_bytes();
        let computed: [u8; 32] = Sha256::digest(&sig).into();
        assert_eq!(computed[..], expected_randomness[..]);
    }

    #[test]
    fn accepts_valid_beacon() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        execute(deps.as_mut(), env, message_info(), add_beacon_msg()).unwrap();
    }

    #[test]
    fn rejects_invalid_bls_signature() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        let mut sig = signature_bytes();
        sig[0] ^= 0xF3;

        // Recompute randomness for the tampered signature so it passes the SHA256 check
        // but should still fail BLS verification
        let tampered_randomness: [u8; 32] = Sha256::digest(&sig).into();

        let msg = ExecuteMsg::AddBeacon {
            round: Uint64::new(ROUND),
            signature: HexBinary::from(sig),
            randomness: HexBinary::from(tampered_randomness.to_vec()),
        };

        let res = execute(deps.as_mut(), env, message_info(), msg);
        assert!(res.is_err());
        match res.unwrap_err() {
            ContractError::InvalidSignature { .. } => {}
            e => panic!("expected InvalidSignature, got: {:?}", e),
        }
    }

    #[test]
    fn rejects_wrong_round() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        // Use valid signature but wrong round
        let msg = ExecuteMsg::AddBeacon {
            round: Uint64::new(ROUND + 1),
            signature: HexBinary::from(signature_bytes()),
            randomness: HexBinary::from(randomness_bytes()),
        };

        let res = execute(deps.as_mut(), env, message_info(), msg);
        assert!(res.is_err());
    }

    #[test]
    fn rejects_mismatched_randomness() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        let mut rand = randomness_bytes();
        rand[0] ^= 0xF3;

        let msg = ExecuteMsg::AddBeacon {
            round: Uint64::new(ROUND),
            signature: HexBinary::from(signature_bytes()),
            randomness: HexBinary::from(rand),
        };

        let res = execute(deps.as_mut(), env, message_info(), msg);
        assert_eq!(res.unwrap_err(), ContractError::InvalidRandomness);
    }

    #[test]
    fn latest_beacon() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        execute(deps.as_mut(), env.clone(), message_info(), add_beacon_msg()).unwrap();

        let res = query(deps.as_ref(), env, QueryMsg::LatestBeacon {}).unwrap();
        let value: ConcreteBeacon = from_json(&res).unwrap();
        assert_eq!(hex::encode(value.uniform_seed), RANDOMNESS_HEX);
    }

    #[test]
    fn get_beacon() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        execute(deps.as_mut(), env.clone(), message_info(), add_beacon_msg()).unwrap();

        let res = query(
            deps.as_ref(),
            env,
            QueryMsg::Beacon {
                round: Uint64::new(ROUND),
            },
        )
        .unwrap();

        let value: BeaconResponse = from_json(&res).unwrap();
        assert_eq!(hex::encode(value.uniform_seed), RANDOMNESS_HEX);
    }

    #[test]
    fn test_idempotency() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        // 1. First submission (Should succeed and process)
        let res = execute(deps.as_mut(), env.clone(), message_info(), add_beacon_msg()).unwrap();
        assert!(res.attributes.iter().all(|a| a.key != "status"));

        // 2. Second submission (Should succeed but skip processing)
        let res2 = execute(deps.as_mut(), env.clone(), message_info(), add_beacon_msg()).unwrap();
        let status = res2.attributes.iter().find(|a| a.key == "status").unwrap();
        assert_eq!(status.value, "already_processed");
    }
}
