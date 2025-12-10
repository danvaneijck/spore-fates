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

const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

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
    last_scanned_id?: string | null;
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
     * Internal: Fetch a single page of stats
     */
    async getPlayerProfilePage(
        address: string,
        startAfter?: string
    ): Promise<PlayerProfile | null> {
        try {
            const queryMsg = {
                get_player_profile: {
                    address,
                    start_after: startAfter || null,
                    limit: 50,
                },
            };
            const response = await wasmApi.fetchSmartContractState(
                NETWORK_CONFIG.gameControllerAddress,
                queryMsg
            );
            return JSON.parse(new TextDecoder().decode(response.data));
        } catch (error) {
            console.error("Error fetching profile page:", error);
            return null;
        }
    },

    /**
     * Public: Recursively fetch ALL pages and sum them up.
     * This solves the pagination problem completely for the UI.
     */
    async getFullPlayerProfile(address: string): Promise<PlayerProfile | null> {
        let totalMushrooms = 0;
        let totalShares = BigInt(0);
        let totalRewards = BigInt(0);
        let globalBestId: string | null = null;

        let lastId: string | undefined = undefined;
        let hasMore = true;

        // Loop until no more tokens
        while (hasMore) {
            const page: PlayerProfile | null = await this.getPlayerProfilePage(
                address,
                lastId
            );

            if (!page || page.total_mushrooms === 0) {
                break;
            }

            // Aggregate Data
            totalMushrooms += page.total_mushrooms;
            totalShares += BigInt(page.total_shares);
            totalRewards += BigInt(page.total_pending_rewards);

            // Simple logic: grab the first "best" found.
            // (To be perfectly accurate, the contract would need to return shares of best_id,
            // but this is sufficient for a general stats card).
            if (!globalBestId && page.best_mushroom_id) {
                globalBestId = page.best_mushroom_id;
            }

            // Pagination Control
            if (page.last_scanned_id) {
                lastId = page.last_scanned_id;
            } else {
                hasMore = false;
            }
        }

        return {
            total_mushrooms: totalMushrooms,
            total_shares: totalShares.toString(),
            total_pending_rewards: totalRewards.toString(),
            best_mushroom_id: globalBestId,
            last_scanned_id: null,
        };
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
     * Construct the Mint Message
     * Calling the CW721 directly (Assuming the user is allowed to mint,
     * or this is a demo where the wallet is the 'minter')
     */
    makeMintMsg(userAddress: string, priceRaw: string) {
        const msg = {
            mint: {},
        };

        return new MsgExecuteContract({
            sender: userAddress,
            contractAddress: NETWORK_CONFIG.gameControllerAddress,
            msg: msg,
            funds: {
                denom: NETWORK_CONFIG.paymentDenom,
                amount: priceRaw, // Use the dynamic price passed in
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
        // 1. Get Live Data from Contract
        const priceResponse = await this.getCurrentMintPrice();
        const config = await this.getGameConfig();

        const currentPrice = BigInt(priceResponse);
        const increment = BigInt(config?.mint_cost_increment || "0");

        const msgs = [];

        // 2. Generate Messages with Progressive Costs
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
        // A. Fetch the beacon from Drand Public API
        let beacon;
        try {
            const response = await fetch(
                `${DRAND_HTTP_URL}/${DRAND_HASH}/public/${targetRound}`
            );
            beacon = await response.json();
        } catch (e) {
            console.error("Drand round not ready yet");
            throw new Error("Randomness not generated yet. Please wait.");
        }

        // B. Construct Oracle Update Message
        // The contract expects HexBinary, which accepts the raw hex string from Drand API.
        // No Base64 conversion needed.
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
    async getLeaderboard(): Promise<LeaderboardItem[]> {
        try {
            // 1. Get the range (1 to TotalMinted)
            const stats = await this.getGameStats();
            if (!stats) return [];

            const totalMinted = stats.total_minted;
            if (totalMinted === 0) return [];

            // Create array of IDs ["1", "2", ... total]
            const allIds = Array.from({ length: totalMinted }, (_, i) =>
                (i + 1).toString()
            );

            // 2. Fetch Game Info for ALL tokens (Batched to avoid RPC rate limits)
            const BATCH_SIZE = 20; // 20 requests at a time
            const chunks = chunkArray(allIds, BATCH_SIZE);
            let allTokenData: { id: string; power: number }[] = [];

            for (const chunk of chunks) {
                // Run a batch in parallel
                const batchResults = await Promise.all(
                    chunk.map(async (id) => {
                        try {
                            const info = await this.getTokenGameInfo(id);
                            // If info is null, the token was burned (spliced)
                            if (!info) return null;
                            return {
                                id,
                                power: parseFloat(info.current_shares),
                            };
                        } catch (e) {
                            return null;
                        }
                    })
                );
                // Filter out nulls (burned tokens) and add to list
                const validResults = batchResults.filter(
                    (item) => item !== null
                ) as { id: string; power: number }[];
                allTokenData = [...allTokenData, ...validResults];
            }

            // 3. Sort by Power (Descending)
            allTokenData.sort((a, b) => b.power - a.power);

            // 4. Take Top 3 and fetch their Owners
            const top3 = allTokenData.slice(0, 3);

            const leaderboardWithOwners = await Promise.all(
                top3.map(async (item, index) => {
                    // We need to fetch the owner from CW721 for the display
                    let owner = "Unknown";
                    try {
                        const queryMsg = { owner_of: { token_id: item.id } };
                        const res = await wasmApi.fetchSmartContractState(
                            NETWORK_CONFIG.cw721Address,
                            queryMsg
                        );
                        const data = JSON.parse(
                            new TextDecoder().decode(res.data)
                        );
                        owner = data.owner;
                        // Format address (inj1...xyz)
                        owner = `${owner.slice(0, 6)}...${owner.slice(-4)}`;
                    } catch (e) {
                        console.error(`Failed to fetch owner for #${item.id}`);
                    }

                    return {
                        rank: index + 1,
                        id: item.id,
                        power: item.power,
                        owner,
                    };
                })
            );

            return leaderboardWithOwners;
        } catch (error) {
            console.error("Error calculating leaderboard:", error);
            return [];
        }
    },
};
