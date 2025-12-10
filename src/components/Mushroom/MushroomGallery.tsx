import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Plus, Zap, Loader2, Coins, ArrowDownWideNarrow, Wheat, AlertTriangle } from 'lucide-react';
import { shroomService } from '../../services/shroomService';
import { MsgBroadcaster } from "@injectivelabs/wallet-core";
import { walletStrategy } from '../Wallet/WalletConnect';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { NETWORK_CONFIG } from '../../config';
import { showTransactionToast } from '../../utils/toast';
import { HarvestModal } from '../Modals/HarvestModal';
import { BatchMintModal } from '../Modals/BatchMintModal';
import { MsgExecuteContract } from '@injectivelabs/sdk-ts';
import { useWalletStore } from '../../store/walletStore';
import { useGameStore } from '../../store/gameStore';
import { SporeLogo } from '../Logo/SporeLogo';

interface Props {
    currentTokenId: string;
}

interface TokenData {
    id: string;
    shares: number;
    dominance: number;
    pendingRewards: number; // Actual Payout (0 if in Shadow Zone)
    formattedRewards: string;
    accumulatedRewards: number; // Raw Accumulated (Ignored Weather)
    formattedAccumulated: string;
    multiplier: number;
}

type SortOption = 'power' | 'rewards';

export const MushroomGallery: React.FC<Props> = ({ currentTokenId }) => {
    const { connectedWallet: address } = useWalletStore();
    const { refreshTrigger } = useGameStore();

    const [galleryData, setGalleryData] = useState<TokenData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('power');

    // Mint Modal State
    const [isMintModalOpen, setIsMintModalOpen] = useState(false);
    const [isMinting, setIsMinting] = useState(false);

    // Harvest Modal State
    const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
    const [isHarvestPreparing, setIsHarvestPreparing] = useState(false);
    const [isHarvesting, setIsHarvesting] = useState(false);
    const [harvestStats, setHarvestStats] = useState<{
        count: number;
        totalRewards: string;
        sacrificedStats: { cap: number; stem: number; spores: number };
        targetIds: string[];
    } | null>(null);

    const navigate = useNavigate();

    // --- DATA FETCHING ---
    const fetchTokens = useCallback(async () => {
        setIsLoading(true);
        try {
            const ids = await shroomService.getTokensOwned(address);
            const globalState = await shroomService.getGlobalState();
            const globalTotalShares = globalState ? parseFloat(globalState.total_shares) : 1;

            const promises = ids.map(async (id) => {
                const [gameInfo, rewardInfo] = await Promise.all([
                    shroomService.getTokenGameInfo(id),
                    shroomService.getPendingRewards(id)
                ]);

                const shares = gameInfo ? parseFloat(gameInfo.current_shares) : 0;

                // Parse Rewards
                const rawPayout = rewardInfo ? BigInt(rewardInfo.payout) : BigInt(0);
                const rawAccumulated = rewardInfo ? BigInt(rewardInfo.accumulated) : BigInt(0);
                const multiplier = rewardInfo ? parseFloat(rewardInfo.multiplier) : 0;

                const dominance = globalTotalShares > 0 ? (shares / globalTotalShares) * 100 : 0;

                const pendingRewards = Number(rawPayout) / Math.pow(10, NETWORK_CONFIG.paymentDecimals || 6);
                const accumulatedRewards = Number(rawAccumulated) / Math.pow(10, NETWORK_CONFIG.paymentDecimals || 6);

                return {
                    id,
                    shares,
                    dominance,
                    pendingRewards,
                    formattedRewards: pendingRewards.toLocaleString(undefined, {
                        minimumFractionDigits: 2, maximumFractionDigits: 4
                    }),
                    accumulatedRewards,
                    formattedAccumulated: accumulatedRewards.toLocaleString(undefined, {
                        minimumFractionDigits: 2, maximumFractionDigits: 4
                    }),
                    multiplier
                };
            });

            const results = await Promise.all(promises);
            setGalleryData(results);
        } catch (error) {
            console.error("Failed to load colony stats", error);
        } finally {
            setIsLoading(false);
        }
    }, [address]);

    useEffect(() => {
        if (!address) return;
        fetchTokens();
    }, [address, fetchTokens, refreshTrigger]);

    // --- SORTING ---
    const sortedGallery = useMemo(() => {
        return [...galleryData].sort((a, b) => {
            if (sortBy === 'power') {
                if (b.shares === a.shares) return b.pendingRewards - a.pendingRewards;
                return b.shares - a.shares;
            } else {
                // Primary Sort: Who has the most CLAIMABLE rewards?
                if (b.pendingRewards !== a.pendingRewards) {
                    return b.pendingRewards - a.pendingRewards;
                }
                // Secondary Sort: If Payouts are equal (e.g. both 0), who has the most ACCUMULATED (Trapped) rewards?
                if (b.accumulatedRewards !== a.accumulatedRewards) {
                    return b.accumulatedRewards - a.accumulatedRewards;
                }
                return b.shares - a.shares;
            }
        });
    }, [galleryData, sortBy]);

    // --- HARVEST LOGIC ---
    const harvestableTokens = useMemo(() => {
        return galleryData.filter(t => t.pendingRewards > 0 && t.multiplier >= 1);
    }, [galleryData]);

    const handleHarvestAllClick = async () => {
        setIsHarvestModalOpen(true);
        setIsHarvestPreparing(true);
        setHarvestStats(null);

        try {
            const targetIds = harvestableTokens.map(t => t.id);
            let totalCap = 0;
            let totalStem = 0;
            let totalSpores = 0;

            const traitPromises = targetIds.map(id => shroomService.getShroomTraits(id));
            const allTraits = await Promise.all(traitPromises);

            allTraits.forEach(trait => {
                if (trait) {
                    if (trait.cap > 0) totalCap += trait.cap;
                    if (trait.stem > 0) totalStem += trait.stem;
                    if (trait.spores > 0) totalSpores += trait.spores;
                }
            });

            const totalRewards = harvestableTokens.reduce((sum, t) => sum + t.pendingRewards, 0);

            setHarvestStats({
                count: targetIds.length,
                totalRewards: totalRewards.toString(),
                sacrificedStats: {
                    cap: totalCap,
                    stem: totalStem,
                    spores: totalSpores
                },
                targetIds
            });

        } catch (e) {
            console.error("Error preparing harvest", e);
            showTransactionToast.error("Failed to analyze harvest data");
            setIsHarvestModalOpen(false);
        } finally {
            setIsHarvestPreparing(false);
        }
    };

    const handleConfirmHarvest = async () => {
        if (!harvestStats) return;
        setIsHarvesting(true);
        const toastId = showTransactionToast.loading("Harvesting rewards...");

        try {
            const msgs = harvestStats.targetIds.map(id => {
                return new MsgExecuteContract({
                    sender: address,
                    contractAddress: NETWORK_CONFIG.gameControllerAddress,
                    msg: { harvest: { token_id: id } }
                });
            });

            const network = NETWORK_CONFIG.network === "mainnet" ? Network.Mainnet : Network.Testnet;
            const endpoints = getNetworkEndpoints(network);
            const broadcaster = new MsgBroadcaster({
                walletStrategy: walletStrategy,
                network,
                endpoints,
                simulateTx: true,
            });

            await broadcaster.broadcastV2({ msgs, injectiveAddress: address });
            showTransactionToast.dismiss(toastId);
            showTransactionToast.success("Harvest complete!");
            setIsHarvestModalOpen(false);
            await new Promise(r => setTimeout(r, 2000));
            fetchTokens();

        } catch (e: any) {
            console.error(e);
            showTransactionToast.dismiss(toastId);
            showTransactionToast.error(e.message || "Harvest failed");
        } finally {
            setIsHarvesting(false);
        }
    };

    const handleSelect = (id: string) => navigate(`/play/${id}`);

    const handleBatchMint = async (count: number) => {
        setIsMinting(true);
        const toastId = showTransactionToast.loading(`Cultivating ${count} mushrooms...`);
        try {
            const msgs = await shroomService.makeBatchMintMsgs(address, count);
            const network = NETWORK_CONFIG.network === "mainnet" ? Network.Mainnet : Network.Testnet;
            const endpoints = getNetworkEndpoints(network);
            const broadcaster = new MsgBroadcaster({
                walletStrategy: walletStrategy,
                network,
                endpoints,
                simulateTx: true,
            });
            console.log(walletStrategy.wallet)
            await broadcaster.broadcastV2({ msgs, injectiveAddress: address });
            showTransactionToast.dismiss(toastId);
            showTransactionToast.success("Batch mint successful! refreshing colony...");
            setIsMintModalOpen(false);
            await new Promise(r => setTimeout(r, 2000));
            fetchTokens();
        } catch (e: any) {
            console.error(e);
            showTransactionToast.dismiss(toastId);
            showTransactionToast.error(e.message || "Mint failed");
        } finally {
            setIsMinting(false);
        }
    };

    if (!address) return null;

    return (
        <div className="m-auto  bg-surface/50 border border-border rounded-xl p-4 h-fit mb-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-text font-bold flex items-center gap-2">
                    <SporeLogo size={40} />
                    Colony ({galleryData.length})
                </h3>

                <div className="flex items-center gap-2">
                    {/* Harvest All Button */}
                    {harvestableTokens.length > 0 && (
                        <button
                            onClick={handleHarvestAllClick}
                            className="flex items-center gap-1.5 px-2 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors border border-green-500/20 text-xs font-bold"
                            title="Harvest All Ready"
                        >
                            <Wheat size={14} />
                            Harvest ({harvestableTokens.length})
                        </button>
                    )}

                    <button
                        onClick={() => setIsMintModalOpen(true)}
                        className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors border border-primary/20"
                        title="Mint New Mushroom"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Sort Controls */}
            {galleryData.length > 0 && (
                <div className="flex gap-2 mb-3 pb-3 border-b border-white/5">
                    <button
                        onClick={() => setSortBy('power')}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-colors ${sortBy === 'power'
                            ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                            : 'bg-black/20 text-textSecondary hover:bg-black/40'
                            }`}
                    >
                        <Zap size={12} />
                        Sort Power
                        {sortBy === 'power' && <ArrowDownWideNarrow size={10} />}
                    </button>
                    <button
                        onClick={() => setSortBy('rewards')}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-colors ${sortBy === 'rewards'
                            ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                            : 'bg-black/20 text-textSecondary hover:bg-black/40'
                            }`}
                    >
                        <Coins size={12} />
                        Sort Rewards
                        {sortBy === 'rewards' && <ArrowDownWideNarrow size={10} />}
                    </button>
                </div>
            )}

            {/* List */}
            {isLoading && galleryData.length === 0 ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-primary" size={24} />
                </div>
            ) : galleryData.length === 0 ? (
                <div className="text-textSecondary text-sm italic py-4 text-center">
                    No mushrooms found. <br />
                    <button
                        onClick={() => setIsMintModalOpen(true)}
                        className="text-primary hover:underline mt-1 font-bold"
                    >
                        Mint one to start!
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto dark-scrollbar pr-1">
                    {sortedGallery.map((token) => (
                        <button
                            key={token.id}
                            onClick={() => handleSelect(token.id)}
                            className={`
                                w-full flex items-center justify-between p-3 rounded-xl border transition-all group relative
                                ${token.id === currentTokenId
                                    ? 'bg-primary/10 border-primary text-text'
                                    : 'bg-background border-border text-textSecondary hover:border-primary/50'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`
                                    p-2 rounded-lg relative
                                    ${token.id === currentTokenId ? 'bg-primary text-white' : 'bg-surface text-textSecondary'}
                                `}>
                                    <SporeLogo size={30} />
                                    {/* Green dot if claimable */}
                                    {token.pendingRewards > 0 && (
                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-surface shadow-sm" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <span className="block font-mono font-bold text-sm">#{token.id}</span>
                                    <span className={`text-[10px] block ${token.dominance > 10 ? 'text-green-400' : 'text-textSecondary'}`}>
                                        Dom: {token.dominance.toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] uppercase opacity-50 font-bold">Power</span>
                                    <div className="flex items-center gap-1 font-mono text-sm font-bold text-yellow-500">
                                        <Zap size={12} fill="currentColor" />
                                        {token.shares}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end min-w-[60px]">
                                    {/* Logic to choose which reward value and color to show */}
                                    {(() => {
                                        const isShadowZone = token.multiplier < 0.8;
                                        const hasPending = token.pendingRewards > 0;
                                        const hasAccumulated = token.accumulatedRewards > 0;

                                        if (hasPending) {
                                            // Case 1: Active Rewards (Green)
                                            return (
                                                <>
                                                    <span className="text-[9px] uppercase opacity-50 font-bold">Pending</span>
                                                    <span className="font-mono text-sm font-bold text-green-400">
                                                        {token.formattedRewards}
                                                    </span>
                                                </>
                                            );
                                        } else if (hasAccumulated && isShadowZone) {
                                            // Case 2: Shadow Zone (Orange/Red)
                                            return (
                                                <>
                                                    <span className="text-[9px] uppercase opacity-70 font-bold text-orange-400 flex items-center gap-1">
                                                        <AlertTriangle size={8} /> Trapped
                                                    </span>
                                                    <span className="font-mono text-sm font-bold text-orange-400/80 line-through decoration-white/20">
                                                        {token.formattedAccumulated}
                                                    </span>
                                                </>
                                            );
                                        } else {
                                            // Case 3: Nothing (Grey)
                                            return (
                                                <>
                                                    <span className="text-[9px] uppercase opacity-50 font-bold">Pending</span>
                                                    <span className="font-mono text-sm font-bold text-textSecondary">
                                                        0.00
                                                    </span>
                                                </>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <BatchMintModal
                isOpen={isMintModalOpen}
                onClose={() => setIsMintModalOpen(false)}
                onConfirm={handleBatchMint}
                isLoading={isMinting}
            />

            <HarvestModal
                isOpen={isHarvestModalOpen}
                onClose={() => setIsHarvestModalOpen(false)}
                onConfirm={handleConfirmHarvest}
                isLoading={isHarvesting}
                isPreparing={isHarvestPreparing}
                stats={harvestStats}
            />
        </div>
    );
};