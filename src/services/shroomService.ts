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
    base_cap: number;
    base_stem: number;
    base_spores: number;
    genome: number[]; // Parsed array of gene IDs
}

export interface TokenGameInfo {
    current_shares: string;
    reward_debt: string;
    pending_rewards: string;
}

export interface EcosystemMetrics {
    total_biomass: {
        total_base_cap: string;
        total_base_stem: string;
        total_base_spores: string;
    };
    cap_multiplier: string;
    stem_multiplier: string;
    spores_multiplier: string;
}

export interface RewardInfo {
    accumulated: string; // Raw
    multiplier: string;
    payout: string; // Actual
}

export interface GameStats {
    total_minted: number;
    total_burned: number;
    current_supply: number;
    total_spins: number;
    total_rewards_distributed: string;
    total_biomass: {
        total_base_cap: string;
        total_base_stem: string;
        total_base_spores: string;
    };
}

export const shroomService = {
    /**
     * Query the CW721 contract for a specific token's traits
     */
    async getShroomTraits(tokenId: string): Promise<TraitExtension | null> {
        try {
            const queryMsg = { nft_info: { token_id: tokenId } };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.cw721Address,
                queryMsg
            );

            const data = JSON.parse(new TextDecoder().decode(response.data));
            const rawTraits = data.extension.attributes.reduce(
                (acc: any, curr: any) => {
                    acc[curr.trait_type] = curr.value;
                    return acc;
                },
                {}
            );

            // Parse Genome String "[1, 2, 3]" -> [1, 2, 3]
            let parsedGenome: number[] = [];
            if (rawTraits.genome && typeof rawTraits.genome === "string") {
                try {
                    parsedGenome = JSON.parse(rawTraits.genome);
                } catch (e) {
                    console.warn(
                        "Failed to parse genome string",
                        rawTraits.genome
                    );
                }
            }

            return {
                cap: parseInt(rawTraits.cap || "0"),
                stem: parseInt(rawTraits.stem || "0"),
                spores: parseInt(rawTraits.spores || "0"),
                substrate: parseInt(rawTraits.substrate || "0"),
                base_cap: parseInt(rawTraits.base_cap || "0"),
                base_stem: parseInt(rawTraits.base_stem || "0"),
                base_spores: parseInt(rawTraits.base_spores || "0"),
                genome: parsedGenome,
            };
        } catch (error) {
            return null;
        }
    },

    /**
     * Get the "Weather" (Multipliers)
     */
    async getEcosystemMetrics(): Promise<EcosystemMetrics | null> {
        try {
            const queryMsg = { get_ecosystem_metrics: {} };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            return JSON.parse(new TextDecoder().decode(response.data));
        } catch (error) {
            console.error("Error fetching ecosystem metrics:", error);
            return null;
        }
    },

    /**
     * Get the accurate, real-time pending rewards
     */
    async getPendingRewards(tokenId: string): Promise<RewardInfo> {
        try {
            const queryMsg = { get_pending_rewards: { token_id: tokenId } };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            const data = JSON.parse(new TextDecoder().decode(response.data));

            return {
                accumulated: data.accumulated_rewards,
                multiplier: data.canopy_multiplier,
                payout: data.estimated_payout,
            };
        } catch (error) {
            console.error("Error fetching rewards:", error);
            return { accumulated: "0", multiplier: "1", payout: "0" };
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
            console.error(error);
            // Silently fail if token doesn't exist in game controller yet
            return null;
        }
    },

    /**
     * Check if the Game Controller is an approved operator for the user
     */
    async isApprovedForAll(owner: string, operator: string): Promise<boolean> {
        try {
            const queryMsg = {
                approval: {
                    token_id: "1", // In standard CW721, operator status is global, but we check specific approval or operator
                    spender: operator,
                    include_expired: false,
                },
            };

            // Note: Standard CW721 usually has `ApprovedForAll { owner, include_expired }`
            // But usually checking `Operator` is safer.
            // Let's use the specific operator check defined in your contract's QueryMsg or CW721 standard
            const operatorQuery = {
                operator: {
                    owner: owner,
                    operator: operator,
                    include_expired: false,
                },
            };

            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.cw721Address,
                operatorQuery
            );

            const data = JSON.parse(new TextDecoder().decode(response.data));
            console.log(data);
            // Returns { approval: { spender, expires } } if approved, or something similar depending on implementation
            // Standard CW721 `OperatorResponse` is { approval: ... } or null
            return !!data.approval;
        } catch (error) {
            console.log("Not an operator");
            return false;
        }
    },

    /**
     * Create Approve All Message
     */
    makeApproveAllMsg(sender: string, operator: string) {
        const msg = {
            approve_all: {
                operator: operator,
                expires: null,
            },
        };

        return new MsgExecuteContract({
            sender: sender,
            contractAddress: NETWORK_CONFIG.cw721Address,
            msg: msg,
        });
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

    makeSpliceMsg(userAddress: string, parent1Id: string, parent2Id: string) {
        const msg = {
            splice: {
                parent_1_id: parent1Id,
                parent_2_id: parent2Id,
            },
        };

        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: msg,
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

    async getGameStats(): Promise<GameStats | null> {
        try {
            const queryMsg = { get_game_stats: {} };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            // console.log(JSON.parse(new TextDecoder().decode(response.data)));
            return JSON.parse(new TextDecoder().decode(response.data));
        } catch (error) {
            console.error("Error fetching game stats:", error);
            return null;
        }
    },

    /**
     * Create multiple mint messages with correct progressive pricing
     */
    async makeBatchMintMsgs(userAddress: string, count: number) {
        const currentPrice = BigInt(
            NETWORK_CONFIG.mintCost *
                Math.pow(10, NETWORK_CONFIG.paymentDecimals)
        );
        const increment = 0n;

        const msgs = [];

        // 2. Generate Messages
        for (let i = 0; i < count; i++) {
            const specificPrice = currentPrice + increment * BigInt(i);

            const msg = { mint: {} };

            msgs.push(
                new MsgExecuteContract({
                    sender: userAddress,
                    contractAddress: NETWORK_CONFIG.gameControllerAddress,
                    msg: msg,
                    funds: {
                        denom: NETWORK_CONFIG.paymentDenom,
                        amount: specificPrice.toString(),
                    },
                })
            );
        }

        return msgs;
    },
};
