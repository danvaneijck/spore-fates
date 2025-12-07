import { MsgExecuteContract } from "@injectivelabs/sdk-ts";
import { ChainGrpcWasmApi } from "@injectivelabs/sdk-ts";
import { NETWORK_CONFIG } from "../config";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";

const network =
    NETWORK_CONFIG.network === "mainnet" ? Network.Mainnet : Network.Testnet;

const endpoints = getNetworkEndpoints(network);

// Initialize the Query API (Testnet endpoint)
const wasmApi = new ChainGrpcWasmApi(endpoints.grpc);

export interface TraitExtension {
    cap: number;
    stem: number;
    spores: number;
    substrate: number;
}

export interface TokenGameInfo {
    current_shares: string;
    reward_debt: string;
    pending_rewards: string;
}

export const shroomService = {
    /**
     * Query the CW721 contract for a specific token's traits
     */
    async getShroomTraits(tokenId: string): Promise<TraitExtension | null> {
        try {
            const queryMsg = {
                nft_info: {
                    token_id: tokenId,
                },
            };

            // Query the contract directly
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.cw721Address,
                queryMsg
            );

            const data = JSON.parse(new TextDecoder().decode(response.data));

            // Map the response to our interface
            // Note: Rust i8 comes back as number in JSON
            console.log(data);
            return data.extension;
        } catch (error) {
            console.error("Error fetching traits:", error);
            return null;
        }
    },

    /**
     * Get the accurate, real-time pending rewards
     */
    async getPendingRewards(tokenId: string): Promise<string> {
        try {
            const queryMsg = {
                get_pending_rewards: {
                    token_id: tokenId,
                },
            };

            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );

            const data = JSON.parse(new TextDecoder().decode(response.data));
            return data.pending_rewards;
        } catch (error) {
            console.error("Error fetching pending rewards:", error);
            return "0";
        }
    },

    async getTokensOwned(ownerAddress: string): Promise<string[]> {
        try {
            const queryMsg = {
                tokens: {
                    owner: ownerAddress,
                    limit: 30, // Fetch first 30 for now
                },
            };

            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.cw721Address,
                queryMsg
            );

            const data = JSON.parse(new TextDecoder().decode(response.data));
            // standard cw721 response: { tokens: ["1", "2", "3"] }
            return data.tokens || [];
        } catch (error) {
            console.error("Error fetching owned tokens:", error);
            return [];
        }
    },

    async getTokenGameInfo(tokenId: string): Promise<TokenGameInfo | null> {
        try {
            const queryMsg = {
                token_info: {
                    token_id: tokenId,
                },
            };

            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );

            // Decode response
            const data = JSON.parse(new TextDecoder().decode(response.data));

            // The contract returns null if token hasn't interacted with game yet
            if (!data) return null;

            return data;
        } catch (error) {
            // Silently fail if token doesn't exist in game controller yet
            return null;
        }
    },

    /**
     * Construct the Mint Message
     * Calling the CW721 directly (Assuming the user is allowed to mint,
     * or this is a demo where the wallet is the 'minter')
     */
    makeMintMsg(userAddress: string) {
        const msg = {
            mint: {},
        };

        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: msg,
            funds: {
                denom: NETWORK_CONFIG.paymentDenom,
                amount: (
                    NETWORK_CONFIG.mintCost *
                    Math.pow(10, NETWORK_CONFIG.paymentDecimals)
                ).toFixed(0),
            },
        });
    },

    /**
     * Construct the Spin Message
     * Calls the Game Controller contract and sends funds
     */
    makeSpinMsg(
        userAddress: string,
        tokenId: string,
        target: "cap" | "stem" | "spores"
    ) {
        // Rust Enum `TraitTarget` with `cw_serde` usually expects snake_case string
        const targetFormatted = target.toLowerCase();

        const msg = {
            spin: {
                token_id: tokenId,
                trait_target: targetFormatted,
            },
        };

        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: msg,
            // Attach funds for the spin cost
            funds: {
                denom: NETWORK_CONFIG.paymentDenom,
                amount: (
                    NETWORK_CONFIG.spinCost *
                    Math.pow(10, NETWORK_CONFIG.paymentDecimals)
                ).toFixed(0),
            },
        });
    },

    /**
     * Construct Harvest Message
     */
    makeHarvestMsg(userAddress: string, tokenId: string) {
        const msg = {
            harvest: {
                token_id: tokenId,
            },
        };

        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: msg,
        });
    },

    /**
     * Construct Ascend Message
     */
    makeAscendMsg(userAddress: string, tokenId: string) {
        const msg = {
            ascend: {
                token_id: tokenId,
            },
        };

        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: msg,
        });
    },
};
