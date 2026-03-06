# Spore Fates - Deploy & Run

One script to build contracts, deploy to Injective testnet, configure the frontend, and start the dev server.

## Prerequisites

- **Docker** - required for building optimized wasm artifacts
- **injectived** - Injective CLI with a key named `testnet` in the keyring
- **Node.js** (v18+) and npm
- **jq** - for JSON processing in deploy commands

### Setting up injectived key

If you don't have a `testnet` key yet:

```bash
injectived keys add testnet --recover
# Enter your mnemonic when prompted
# Password: 12345678
```

The deployer address in the script is `inj1q2m26a7jdzjyfdn545vqsude3zwwtfrdap5jgz`. Update `DEPLOYER_ADDRESS` and `KEY_NAME` in `deploy_and_run.sh` if yours differs.

## Usage

### Full deploy (build + deploy + start frontend)

```bash
./deploy_and_run.sh
```

This runs all 4 steps:
1. Builds optimized `.wasm` artifacts via Docker (`cosmwasm/workspace-optimizer:0.17.0`)
2. Uploads and instantiates all 3 contracts on testnet, transfers CW721 ownership
3. Writes deployed contract addresses to `.env`
4. Starts the Vite dev server

### Skip the Docker build

```bash
./deploy_and_run.sh --skip-build
```

Uses existing artifacts in `contracts/artifacts/`. Useful when you've already built and just want to redeploy.

### Just start the frontend

```bash
./deploy_and_run.sh --skip-deploy
```

Skips both build and deploy. Starts the Vite dev server using whatever addresses are already in `.env`. Use this for day-to-day frontend development against an existing deployment.

## What gets deployed

| Contract | Artifact | Description |
|----------|----------|-------------|
| CW721 Spore | `cw721_spore.wasm` | NFT contract for mushroom tokens |
| Drand Oracle | `drand_oracle.wasm` | On-chain oracle with BLS signature verification |
| Game Controller | `spore_game_controller.wasm` | Core game logic (mint, spin, splice, ascend, harvest) |

The script also handles the CW721 ownership transfer (both minter and creator) to the Game Controller so it can mint and burn NFTs.

## Configuration

Edit the top of `deploy_and_run.sh` to change:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE` | testnet sentry | Injective RPC endpoint |
| `CHAIN_ID` | `injective-888` | Testnet chain ID |
| `KEY_NAME` | `testnet` | injectived keyring key name |
| `PASSWORD` | `12345678` | Keyring password |
| `DEPLOYER_ADDRESS` | `inj1q2m...` | Must match KEY_NAME |
| `PAYMENT_DENOM` | `inj` | Token used for minting/spinning |
| `SPIN_COST` | `10000000000000000` | 0.01 INJ per spin |
| `MINT_COST` | `10000000000000000` | 0.01 INJ base mint price |
| `MINT_SLOPE` | `1000000000000000` | 0.001 INJ price increase per mint |

## .env output

After deploy, the script writes `.env` in the project root:

```
VITE_NETWORK=testnet
VITE_CHAIN_ID=injective-888
VITE_CW721_CONTRACT_ADDRESS=inj1...
VITE_ORACLE_ADDRESS=inj1...
VITE_GAME_CONTROLLER_ADDRESS=inj1...
VITE_MINT_DENOM=inj
VITE_MINT_SYMBOL=INJ
VITE_MINT_DECIMALS=18
VITE_MINT_COST=0.01
VITE_SPIN_COST=0.01
```

Existing `DELEGATE_MNEMONIC`, `VITE_DELEGATE_ADDRESS`, and `JWT_SECRET` values are preserved across redeploys.

## Troubleshooting

**Docker not running**: Start Docker Desktop or the Docker daemon. Alternatively use `--skip-build` if you already have artifacts.

**injectived not found**: Install from [Injective docs](https://docs.injective.network/develop/tools/injectived/install).

**Insufficient funds**: The deployer address needs testnet INJ. Get some from the [Injective testnet faucet](https://testnet.faucet.injective.network/).

**Missing artifacts**: Run without `--skip-build` to build them, or run `cd contracts && ./build_release.sh` separately.
