import { ChainId } from "@injectivelabs/ts-types";

// Configuration for Testnet
export const NETWORK_CONFIG = {
    network: import.meta.env.VITE_NETWORK == "testnet",
    chainId:
        import.meta.env.VITE_NETWORK == "testnet"
            ? ChainId.Testnet
            : ChainId.Mainnet,

    // Replace these with your actual deployed contract addresses
    cw721Address: import.meta.env.VITE_CW721_CONTRACT_ADDRESS,
    gameControllerAddress: import.meta.env.VITE_GAME_CONTROLLER_ADDRESS,

    // Coin settings
    paymentDenom: import.meta.env.VITE_MINT_DENOM,
    paymentSymbol: import.meta.env.VITE_MINT_SYMBOL,
    paymentDecimals: import.meta.env.VITE_MINT_DECIMALS,
    mintCost: import.meta.env.VITE_MINT_COST,
    spinCost: import.meta.env.VITE_SPIN_COST,

    // Explorer URLs
    explorerUrl:
        import.meta.env.VITE_NETWORK == "testnet"
            ? "https://testnet.explorer.injective.network/transaction"
            : "https://explorer.injective.network/transaction",
};
