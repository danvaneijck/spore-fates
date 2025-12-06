# Smart Contract Testing Guide

This guide explains how to run the test suites for the SporeFates smart contracts.

## Prerequisites

**Note: Running tests requires native Rust toolchain and cannot run in WebContainer.**

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm target
rustup target add wasm32-unknown-unknown
```

## Running Tests

### CW721 Spore Contract Tests

```bash
cd contracts/cw721-spore
cargo test
```

**Test Coverage:**
- ✅ Contract instantiation
- ✅ Token minting
- ✅ Trait updates by authorized minter
- ✅ Unauthorized trait update attempts
- ✅ Invalid trait value validation
- ✅ Token transfers

### Game Controller Contract Tests

```bash
cd contracts/spore-game-controller
cargo test
```

**Test Coverage:**
- ✅ Contract instantiation
- ✅ Share calculation logic
- ✅ Spin with insufficient funds
- ✅ Spin with invalid payment denom
- ✅ Successful spin execution
- ✅ Harvest unauthorized attempts
- ✅ Harvest with no rewards
- ✅ Ascend not at max level
- ✅ Ascend at max substrate
- ✅ Token info queries
- ✅ Randomness generation

## Test Output Example

```bash
running 13 tests
test tests::test_instantiate ... ok
test tests::test_calculate_shares ... ok
test tests::test_spin_insufficient_funds ... ok
test tests::test_spin_invalid_payment_denom ... ok
test tests::test_spin_success ... ok
test tests::test_harvest_unauthorized ... ok
test tests::test_harvest_no_rewards ... ok
test tests::test_ascend_not_max_level ... ok
test tests::test_ascend_max_substrate ... ok
test tests::test_query_token_info ... ok
test tests::test_randomness_generation ... ok

test result: ok. 13 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

## Running Specific Tests

```bash
# Run a specific test
cargo test test_instantiate

# Run tests with output
cargo test -- --nocapture

# Run tests with specific pattern
cargo test spin
```

## Test Structure

### CW721 Spore Tests (`cw721-spore/src/lib.rs`)

```rust
#[cfg(test)]
mod tests {
    // Helper functions
    fn setup_contract(deps: DepsMut) -> Result<Response, ContractError>
    fn mint_token(deps: DepsMut, token_id: &str, owner: &str) -> Result<Response, ContractError>
    
    // Test cases
    #[test] fn test_instantiate()
    #[test] fn test_mint_token()
    #[test] fn test_update_traits_by_minter()
    #[test] fn test_update_traits_unauthorized()
    #[test] fn test_invalid_trait_values()
    #[test] fn test_transfer_token()
}
```

### Game Controller Tests (`spore-game-controller/src/lib.rs`)

```rust
#[cfg(test)]
mod tests {
    // Helper functions
    fn setup_contract(deps: DepsMut) -> Result<Response, ContractError>
    fn mock_querier_with_nft(token_id: &str, owner: &str, traits: TraitExtension) -> MockQuerier
    
    // Test cases
    #[test] fn test_instantiate()
    #[test] fn test_calculate_shares()
    #[test] fn test_spin_insufficient_funds()
    #[test] fn test_spin_invalid_payment_denom()
    #[test] fn test_spin_success()
    #[test] fn test_harvest_unauthorized()
    #[test] fn test_harvest_no_rewards()
    #[test] fn test_ascend_not_max_level()
    #[test] fn test_ascend_max_substrate()
    #[test] fn test_query_token_info()
    #[test] fn test_randomness_generation()
}
```

## Mock Testing Strategy

The tests use CosmWasm's built-in mocking utilities:

- **mock_dependencies()**: Creates mock storage, API, and querier
- **mock_env()**: Creates mock blockchain environment
- **mock_info()**: Creates mock message info with sender and funds
- **MockQuerier**: Custom querier for simulating CW721 contract responses

## Key Test Scenarios

### 1. Share Calculation
Tests the formula: `(100 + cap*10 + stem*10 + spores*10) * (1 + substrate)`

### 2. Trait Mutation Logic
- Win: -1 → +1, others increment
- Loss: +1 → -1 (with safety net at substrate 2+)
- Substrate 4 bonus: 10% chance for +2

### 3. Access Control
- Only minter can update traits
- Only owner can harvest/ascend
- Payment validation

### 4. Edge Cases
- Trait value boundaries (-3 to +3, substrate 0 to 4)
- Zero rewards
- Max substrate level
- Insufficient funds

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Test Smart Contracts

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown
      - name: Run CW721 tests
        run: cd contracts/cw721-spore && cargo test
      - name: Run Game Controller tests
        run: cd contracts/spore-game-controller && cargo test
```

## Coverage Report

To generate test coverage:

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage
cd contracts/cw721-spore
cargo tarpaulin --out Html

cd ../spore-game-controller
cargo tarpaulin --out Html
```

## Next Steps

1. **Integration Tests**: Test interaction between both contracts
2. **Fuzzing**: Use cargo-fuzz for property-based testing
3. **Gas Optimization**: Profile tests to identify expensive operations
4. **Mainnet Simulation**: Test on Injective testnet before mainnet deployment
