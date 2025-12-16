import React, { useEffect, useState } from 'react';
import { shroomService, GameStats, LeaderboardItem } from '../../services/shroomService';
import { NETWORK_CONFIG } from '../../config';
import { Activity, Flame, Sprout, Coins, Dna, Crown, Zap, Loader2 } from 'lucide-react';

interface Props {
    refreshTrigger?: number; // Optional prop to trigger immediate updates
}

export const GlobalStatsBanner: React.FC<Props> = ({ refreshTrigger = 0 }) => {
    const [stats, setStats] = useState<GameStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

    // 1. Fast Fetch: Global Counters (Run often)
    const fetchGlobalStats = async () => {
        const data = await shroomService.getGameStats();
        if (data) setStats(data);
    };

    // 2. Slow Fetch: Leaderboard (Run less often)
    const fetchLeaderboard = async () => {
        setLoadingLeaderboard(true);
        const data = await shroomService.getLeaderboard();
        setLeaderboard(data);
        setLoadingLeaderboard(false);
    };

    useEffect(() => {
        fetchGlobalStats();
        // fetchLeaderboard();

        // Poll stats fast (every 10s), Leaderboard slow (every 30s) to save RPC
        const statInterval = setInterval(fetchGlobalStats, 10000);
        // const lbInterval = setInterval(fetchLeaderboard, 60000);

        return () => {
            clearInterval(statInterval);
            // clearInterval(lbInterval);
        };
    }, [refreshTrigger]);

    if (!stats) return null;

    const distributed = (parseFloat(stats.total_rewards_distributed) / Math.pow(10, NETWORK_CONFIG.paymentDecimals)).toLocaleString();

    // Calculate total biomass safely
    const totalBiomass =
        parseInt(stats.total_biomass.total_base_cap) +
        parseInt(stats.total_biomass.total_base_stem) +
        parseInt(stats.total_biomass.total_base_spores);

    return (
        <div className="bg-surface/60 backdrop-blur-md border border-border rounded-3xl mt-4 overflow-hidden shadow-xl">

            {/* ROW 1: GLOBAL COUNTERS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 p-4 border-b border-border/50">
                {/* Supply */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                        <Sprout size={12} className="text-primary" /> Colony Size
                    </div>
                    <div className="text-2xl font-black text-text">{stats.current_supply}</div>
                </div>

                {/* Burned */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                        <Flame size={12} className="text-red-400" /> Sacrificed
                    </div>
                    <div className="text-2xl font-black text-text">{stats.total_burned}</div>
                </div>

                {/* Spins */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                        <Dna size={12} className="text-purple-400" /> Mutations
                    </div>
                    <div className="text-2xl font-black text-text">{stats.total_spins}</div>
                </div>

                {/* Rewards */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                        <Coins size={12} className="text-yellow-400" /> Harvested
                    </div>
                    <div className="text-2xl font-black text-yellow-400">
                        {distributed} <span className="text-xs font-normal text-yellow-600">{NETWORK_CONFIG.paymentSymbol}</span>
                    </div>
                </div>

                {/* Biomass */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                        <Activity size={12} className="text-blue-400" /> Total Biomass
                    </div>
                    <div className="text-2xl font-black text-blue-400">{totalBiomass}</div>
                </div>
            </div>

            {/* ROW 2: LEADERBOARD PODIUM */}
            <div className="bg-black/20  pt-6 flex flex-col justify-center">
                {loadingLeaderboard && leaderboard.length === 0 ? (
                    <div className="flex justify-center items-center gap-2 text-textSecondary text-xs animate-pulse pb-6">
                        <Loader2 size={16} className="animate-spin" /> Calculating Power Levels...
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center items-end gap-4 md:gap-8 pb-2">

                        {/* 2nd Place */}
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 order-1 md:order-none">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-300 text-slate-900 font-black shadow-[0_0_10px_rgba(203,213,225,0.4)]">
                                2
                            </div>
                            <div className="text-left">
                                <div className="text-xs text-slate-300 font-bold flex items-center gap-1">
                                    <span className="opacity-70">#</span>{leaderboard[1]?.id || '?'}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                    <Zap size={10} /> {leaderboard[1]?.power.toLocaleString() || '-'}
                                </div>
                                <div className="text-[9px] text-slate-500 font-mono">
                                    {leaderboard[1]?.owner || '...'}
                                </div>
                            </div>
                        </div>

                        {/* 1st Place (Center/Higher) */}
                        <div className="flex items-center gap-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 px-6 py-4 rounded-2xl border border-yellow-500/30 shadow-lg shadow-yellow-500/10 relative -top-2 order-first md:order-none w-full md:w-auto justify-center">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-lg animate-bounce-short">
                                <Crown size={24} fill="currentColor" />
                            </div>
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-900 font-black text-lg shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                                1
                            </div>
                            <div className="text-left">
                                <div className="text-sm text-yellow-200 font-bold flex items-center gap-1">
                                    <span className="opacity-70">#</span>{leaderboard[0]?.id || '?'}
                                </div>
                                <div className="text-xs font-mono text-yellow-500 font-bold flex items-center gap-1">
                                    <Zap size={12} fill="currentColor" /> {leaderboard[0]?.power.toLocaleString() || '-'}
                                </div>
                                <div className="text-[10px] text-yellow-500/50 font-mono">
                                    {leaderboard[0]?.owner || '...'}
                                </div>
                            </div>
                        </div>

                        {/* 3rd Place */}
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 order-2 md:order-none">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-700 text-amber-100 font-black shadow-[0_0_10px_rgba(180,83,9,0.4)]">
                                3
                            </div>
                            <div className="text-left">
                                <div className="text-xs text-amber-600 font-bold flex items-center gap-1">
                                    <span className="opacity-70">#</span>{leaderboard[2]?.id || '?'}
                                </div>
                                <div className="text-[10px] font-mono text-amber-700 flex items-center gap-1">
                                    <Zap size={10} /> {leaderboard[2]?.power.toLocaleString() || '-'}
                                </div>
                                <div className="text-[9px] text-amber-800/60 font-mono">
                                    {leaderboard[2]?.owner || '...'}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};