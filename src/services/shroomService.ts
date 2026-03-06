import { MsgExecuteContract } from "@injectivelabs/sdk-ts";
import { ChainGrpcWasmApi } from "@injectivelabs/sdk-ts";
import { NETWORK_CONFIG } from "../config";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";

export const DRAND_HASH =
    "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971"; // Quicknet
const DRAND_HTTP_URL = "https://api.drand.sh";

const network =
    NETWORK_CONFIG.network === "mainnet" ? Network.Mainnet : Network.Testnet;

const endpoints = getNetworkEndpoints(network);

// Initialize the Query API (Testnet endpoint)
const wasmApi = new ChainGrpcWasmApi(endpoints.grpc);

export interface LeaderboardItem {
    rank: number;
    id: string;
    power: number;
    owner: string;
}

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

export interface GlobalState {
    total_shares: string;
    global_reward_index: string;
    spin_nonce: number;
}

export interface PlayerProfile {
    total_mushrooms: number;
    total_shares: string;
    total_pending_rewards: string;
    best_mushroom_id: string | null;
}

export const calculateEstimatedShares = (traits: TraitExtension): number => {
    const rawPower = Math.max(
        1,
        traits.cap +
            traits.base_cap +
            (traits.stem + traits.base_stem) +
            (traits.spores + traits.base_spores)
    );

    const quadratic = Math.pow(rawPower, 2);
    const multiplier = 1 + traits.substrate;

    return quadratic * multiplier;
};

export const shroomService = {
    /**
     * Fetch player profile. The contract now uses an internal PLAYER_INFO index
     * so no cross-contract query or pagination is needed.
     */
    async getFullPlayerProfile(address: string): Promise<PlayerProfile | null> {
        try {
            const queryMsg = {
                get_player_profile: { address },
            };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            return JSON.parse(new TextDecoder().decode(response.data));
        } catch (error) {
            console.error("Error fetching player profile:", error);
            return null;
        }
    },

    /**
     * Fetch the core global state (Total Shares, Reward Index)
     */
    async getGlobalState(): Promise<GlobalState | null> {
        try {
            const queryMsg = { global_state: {} };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            return JSON.parse(new TextDecoder().decode(response.data));
        } catch (error) {
            console.error("Error fetching global state:", error);
            return null;
        }
    },

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
            const allTokens: string[] = [];
            let startAfter: string | undefined = undefined;
            const pageLimit = 20;

            while (true) {
                const queryMsg: Record<string, unknown> = {
                    tokens: {
                        owner: ownerAddress,
                        limit: pageLimit,
                        ...(startAfter ? { start_after: startAfter } : {}),
                    },
                };

                const response = await wasmApi.fetchSmartContractState(
                    NETWORK_CONFIG.cw721Address,
                    queryMsg
                );

                const data = JSON.parse(new TextDecoder().decode(response.data));
                const tokens: string[] = data.tokens || [];
                allTokens.push(...tokens);

                if (tokens.length < pageLimit) break;
                startAfter = tokens[tokens.length - 1];
            }

            return allTokens;
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

            return !!data.approval;
        } catch (error) {
            console.log("Not an operator");
            return false;
        }
    },

    /**
     * NEW: Get the current dynamic mint price from the bonding curve
     */
    async getCurrentMintPrice(): Promise<string> {
        try {
            const queryMsg = { get_current_mint_price: {} };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            const data = JSON.parse(new TextDecoder().decode(response.data));
            return data.price;
        } catch (error) {
            console.error("Error fetching mint price:", error);
            // Fallback to base cost from config if query fails
            return (
                NETWORK_CONFIG.mintCost *
                Math.pow(10, NETWORK_CONFIG.paymentDecimals)
            ).toString();
        }
    },

    /**
     * NEW: Fetch contract config to get the bonding curve slope (increment)
     */
    async getGameConfig(): Promise<any> {
        try {
            const queryMsg = { config: {} };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            return JSON.parse(new TextDecoder().decode(response.data));
        } catch (error) {
            console.error("Error fetching config", error);
            return null;
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
     * REQUEST MINT (Step 1: Pay + save pending state)
     */
    makeRequestMintMsg(userAddress: string, priceRaw: string) {
        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: { request_mint: {} },
            funds: {
                denom: NETWORK_CONFIG.paymentDenom,
                amount: priceRaw,
            },
        });
    },

    /**
     * RESOLVE MINT (Step 2: Fetch drand beacon + resolve)
     */
    async makeResolveMintBatchMsg(
        userAddress: string,
        mintId: string,
        targetRound: number
    ) {
        const beacon = await this.fetchDrandBeacon(targetRound);

        const oracleMsg = new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.oracleAddress,
            msg: {
                add_beacon: {
                    round: targetRound.toString(),
                    signature: beacon.signature,
                    randomness: beacon.randomness,
                },
            },
        });

        const gameMsg = new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: { resolve_mint: { mint_id: mintId } },
        });

        return [oracleMsg, gameMsg];
    },

    /**
     * REQUEST SPLICE (Step 1: Lock parents + save pending state)
     */
    makeRequestSpliceMsg(userAddress: string, parent1Id: string, parent2Id: string) {
        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: {
                request_splice: {
                    parent_1_id: parent1Id,
                    parent_2_id: parent2Id,
                },
            },
        });
    },

    /**
     * RESOLVE SPLICE (Step 2: Fetch drand beacon + resolve)
     */
    async makeResolveSpliceBatchMsg(
        userAddress: string,
        spliceId: string,
        targetRound: number
    ) {
        const beacon = await this.fetchDrandBeacon(targetRound);

        const oracleMsg = new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.oracleAddress,
            msg: {
                add_beacon: {
                    round: targetRound.toString(),
                    signature: beacon.signature,
                    randomness: beacon.randomness,
                },
            },
        });

        const gameMsg = new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: { resolve_splice: { splice_id: spliceId } },
        });

        return [oracleMsg, gameMsg];
    },

    getSpinCost(substrateLevel: number): string {
        let multiplier = 1;
        switch (substrateLevel) {
            case 0:
                multiplier = 1;
                break;
            case 1:
                multiplier = 2;
                break;
            case 2:
                multiplier = 3;
                break;
            case 3:
                multiplier = 5;
                break; // Hardened
            case 4:
                multiplier = 10;
                break; // Apex
            default:
                multiplier = 1;
        }

        const baseCost =
            NETWORK_CONFIG.spinCost *
            Math.pow(10, NETWORK_CONFIG.paymentDecimals);
        return (baseCost * multiplier).toFixed(0);
    },

    /**
     * Construct the Spin Message
     * Calls the Game Controller contract and sends funds
     */
    makeSpinMsg(
        userAddress: string,
        tokenId: string,
        target: "cap" | "stem" | "spores",
        cost: string
    ) {
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
            funds: {
                denom: NETWORK_CONFIG.paymentDenom,
                amount: cost,
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
     * REQUEST ASCEND (Step 1: Lock token + save pending state)
     */
    makeRequestAscendMsg(userAddress: string, tokenId: string) {
        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: { request_ascend: { token_id: tokenId } },
        });
    },

    /**
     * RESOLVE ASCEND (Step 2: Fetch drand beacon + resolve)
     */
    async makeResolveAscendBatchMsg(
        userAddress: string,
        tokenId: string,
        targetRound: number
    ) {
        const beacon = await this.fetchDrandBeacon(targetRound);

        const oracleMsg = new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.oracleAddress,
            msg: {
                add_beacon: {
                    round: targetRound.toString(),
                    signature: beacon.signature,
                    randomness: beacon.randomness,
                },
            },
        });

        const gameMsg = new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: { resolve_ascend: { token_id: tokenId } },
        });

        return [oracleMsg, gameMsg];
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
     * Create multiple request_mint messages with correct progressive pricing.
     * All requests target the same drand round and can be resolved together.
     */
    async makeBatchRequestMintMsgs(userAddress: string, count: number) {
        const priceResponse = await this.getCurrentMintPrice();
        const config = await this.getGameConfig();

        const currentPrice = BigInt(priceResponse);
        const increment = BigInt(config?.mint_cost_increment || "0");

        const msgs = [];

        for (let i = 0; i < count; i++) {
            const specificPrice = currentPrice + increment * BigInt(i);

            msgs.push(
                new MsgExecuteContract({
                    sender: userAddress,
                    contractAddress: NETWORK_CONFIG.gameControllerAddress,
                    msg: { request_mint: {} },
                    funds: {
                        denom: NETWORK_CONFIG.paymentDenom,
                        amount: specificPrice.toString(),
                    },
                })
            );
        }

        return msgs;
    },

    /**
     * Resolve multiple pending mints in one batch transaction.
     */
    async makeBatchResolveMintMsgs(
        userAddress: string,
        mintIds: string[],
        targetRound: number
    ) {
        const beacon = await this.fetchDrandBeacon(targetRound);

        // Oracle update only needs to happen once
        const oracleMsg = new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.oracleAddress,
            msg: {
                add_beacon: {
                    round: targetRound.toString(),
                    signature: beacon.signature,
                    randomness: beacon.randomness,
                },
            },
        });

        const resolveMsgs = mintIds.map(
            (mintId) =>
                new MsgExecuteContract({
                    sender: userAddress,
                    contractAddress: NETWORK_CONFIG.gameControllerAddress,
                    msg: { resolve_mint: { mint_id: mintId } },
                })
        );

        return [oracleMsg, ...resolveMsgs];
    },

    /**
     * Shared helper: Fetch a drand beacon by round number
     */
    async fetchDrandBeacon(round: number) {
        try {
            const response = await fetch(
                `${DRAND_HTTP_URL}/${DRAND_HASH}/public/${round}`
            );
            if (!response.ok) throw new Error("Beacon not ready");
            return await response.json();
        } catch (e) {
            console.error("Drand round not ready yet");
            throw new Error("Randomness not generated yet. Please wait.");
        }
    },

    /**
     * Query pending mint status
     */
    async getPendingMintStatus(
        mintId: string
    ): Promise<{ is_pending: boolean; target_round: number }> {
        try {
            const queryMsg = { get_pending_mint: { mint_id: mintId } };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            const data = JSON.parse(new TextDecoder().decode(response.data));
            return {
                is_pending: data.is_pending,
                target_round: parseInt(data.target_round || "0"),
            };
        } catch (error) {
            return { is_pending: false, target_round: 0 };
        }
    },

    /**
     * Query pending splice status
     */
    async getPendingSpliceStatus(
        spliceId: string
    ): Promise<{ is_pending: boolean; target_round: number }> {
        try {
            const queryMsg = { get_pending_splice: { splice_id: spliceId } };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            const data = JSON.parse(new TextDecoder().decode(response.data));
            return {
                is_pending: data.is_pending,
                target_round: parseInt(data.target_round || "0"),
            };
        } catch (error) {
            return { is_pending: false, target_round: 0 };
        }
    },

    /**
     * Query pending ascend status
     */
    async getPendingAscendStatus(
        tokenId: string
    ): Promise<{ is_pending: boolean; target_round: number }> {
        try {
            const queryMsg = { get_pending_ascend: { token_id: tokenId } };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            const data = JSON.parse(new TextDecoder().decode(response.data));
            return {
                is_pending: data.is_pending,
                target_round: parseInt(data.target_round || "0"),
            };
        } catch (error) {
            return { is_pending: false, target_round: 0 };
        }
    },

    /**
     * 1. REQUEST SPIN (First Transaction)
     */
    makeRequestSpinMsg(
        userAddress: string,
        tokenId: string,
        target: string,
        cost: string
    ) {
        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: {
                spin: {
                    // Remember: We renamed the logic to 'request spin' internally, but msg enum is likely still 'Spin'
                    token_id: tokenId,
                    trait_target: target,
                },
            },
            funds: { denom: NETWORK_CONFIG.paymentDenom, amount: cost },
        });
    },

    /**
     * 2. RESOLVE SPIN (Second Transaction - The "User Bot" Action)
     * This creates a BATCH transaction:
     * Msg 1: Update Oracle with Drand Sig
     * Msg 2: Resolve Game Result
     */
    async makeResolveBatchMsg(
        userAddress: string,
        tokenId: string,
        targetRound: number
    ) {
        const beacon = await this.fetchDrandBeacon(targetRound);

        const oracleMsg = new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.oracleAddress,
            msg: {
                add_beacon: {
                    round: targetRound.toString(),
                    signature: beacon.signature, // Pass raw Hex
                    randomness: beacon.randomness, // Pass raw Hex (Required by contract)
                },
            },
        });

        // C. Construct Game Resolve Message
        const gameMsg = new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: {
                resolve_spin: {
                    token_id: tokenId,
                },
            },
        });

        return [oracleMsg, gameMsg];
    },

    /**
     * Check if a token has a pending spin waiting for randomness
     */
    async getPendingSpinStatus(
        tokenId: string
    ): Promise<{ is_pending: boolean; target_round: number }> {
        try {
            const queryMsg = {
                get_pending_spin: {
                    token_id: tokenId,
                },
            };

            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );

            const data = JSON.parse(new TextDecoder().decode(response.data));

            // Contract returns { is_pending: bool, target_round: u64 }
            return {
                is_pending: data.is_pending,
                target_round: parseInt(data.target_round || "0"),
            };
        } catch (error) {
            console.error("Error fetching pending spin status:", error);
            // Return safe default if query fails (e.g. token has no pending state)
            return { is_pending: false, target_round: 0 };
        }
    },

    /**
     * REAL Leaderboard Calculation
     * 1. Fetches total count
     * 2. Scans ALL token_infos
     * 3. Sorts by power
     * 4. Fetches owners for top 3
     */
    async getSvg(tokenId: string): Promise<string | null> {
        try {
            const queryMsg = { get_svg: { token_id: tokenId } };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.cw721Address,
                queryMsg
            );
            const data = JSON.parse(new TextDecoder().decode(response.data));
            return data.svg || null;
        } catch (error) {
            console.error("Error fetching SVG:", error);
            return null;
        }
    },

    async getLeaderboard(): Promise<LeaderboardItem[]> {
        try {
            // Query the on-chain leaderboard (top 10 maintained by the contract)
            const queryMsg = { get_leaderboard: {} };
            const res = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            const { entries } = JSON.parse(
                new TextDecoder().decode(res.data)
            ) as { entries: { token_id: string; score: string }[] };

            if (entries.length === 0) return [];

            // Only fetch owners for the top 3
            const top3 = entries.slice(0, 3);
            const leaderboard = await Promise.all(
                top3.map(async (entry, index) => {
                    let owner = "Unknown";
                    try {
                        const ownerRes = await wasmApi.fetchSmartContractState(
                            NETWORK_CONFIG.cw721Address,
                            { owner_of: { token_id: entry.token_id } }
                        );
                        const data = JSON.parse(
                            new TextDecoder().decode(ownerRes.data)
                        );
                        owner = `${data.owner.slice(0, 6)}...${data.owner.slice(-4)}`;
                    } catch (e) {
                        console.error(`Failed to fetch owner for #${entry.token_id}`);
                    }
                    return {
                        rank: index + 1,
                        id: entry.token_id,
                        power: parseFloat(entry.score),
                        owner,
                    };
                })
            );

            return leaderboard;
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            return [];
        }
    },
};
