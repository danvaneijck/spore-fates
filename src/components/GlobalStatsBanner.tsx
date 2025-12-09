import React, { useEffect, useState } from 'react';
import { shroomService, GameStats } from '../services/shroomService';
import { NETWORK_CONFIG } from '../config';
import { Activity, Flame, Sprout, Coins, Dna } from 'lucide-react';

interface Props {
    refreshTrigger?: number; // Optional prop to trigger immediate updates
}

export const GlobalStatsBanner: React.FC<Props> = ({ refreshTrigger = 0 }) => {
    const [stats, setStats] = useState<GameStats | null>(null);

    const fetchStats = async () => {
        const data = await shroomService.getGameStats();
        if (data) setStats(data);
    };

    // 1. Initial Load + Polling (Every 10 seconds)
    useEffect(() => {
        fetchStats();

        const interval = setInterval(() => {
            fetchStats();
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, []);

    // 2. Instant Refresh when user performs an action
    useEffect(() => {
        fetchStats();
    }, [refreshTrigger]);

    if (!stats) return null;

    const distributed = (parseFloat(stats.total_rewards_distributed) / Math.pow(10, NETWORK_CONFIG.paymentDecimals)).toLocaleString();

    // Calculate total biomass safely
    const totalBiomass =
        parseInt(stats.total_biomass.total_base_cap) +
        parseInt(stats.total_biomass.total_base_stem) +
        parseInt(stats.total_biomass.total_base_spores);

    return (
        <div className="border-t border-border bg-black/20 backdrop-blur-md py-6 rounded-3xl mt-4">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-6 text-center">

                {/* Supply */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sprout size={14} /> Colony Size
                    </div>
                    <div className="text-2xl font-bold text-text">{stats.current_supply}</div>
                    <div className="text-[10px] text-textSecondary">Alive Mushrooms</div>
                </div>

                {/* Burned */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Flame size={14} /> Sacrificed
                    </div>
                    <div className="text-2xl font-bold text-red-400">{stats.total_burned}</div>
                    <div className="text-[10px] text-textSecondary">Burned via Splicing</div>
                </div>

                {/* Spins */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Dna size={14} /> Mutations
                    </div>
                    <div className="text-2xl font-bold text-purple-400">{stats.total_spins}</div>
                    <div className="text-[10px] text-textSecondary">Total Spins</div>
                </div>

                {/* Rewards */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Coins size={14} /> Harvested
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{distributed} <span className="text-xs text-yellow-600">{NETWORK_CONFIG.paymentSymbol}</span></div>
                    <div className="text-[10px] text-textSecondary">Distributed</div>
                </div>

                {/* Activity / Block */}
                <div className="flex flex-col items-center">
                    <div className="text-textSecondary text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Activity size={14} /> Biomass
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                        {totalBiomass}
                    </div>
                    <div className="text-[10px] text-textSecondary">Total Base Stats</div>
                </div>

            </div>
        </div>
    );
};