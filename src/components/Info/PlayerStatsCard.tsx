import React, { useCallback, useEffect, useState } from 'react';
import { shroomService, PlayerProfile } from '../../services/shroomService';
import { NETWORK_CONFIG } from '../../config';
import { User, Zap, Coins, Crown, Sprout, TrendingUp, Activity } from 'lucide-react';

interface Props {
    address: string;
    refreshTrigger: number;
}

export const PlayerStatsCard: React.FC<Props> = ({ address, refreshTrigger }) => {
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        if (!address) return;
        const data = await shroomService.getFullPlayerProfile(address);
        setProfile(data);
        setIsLoading(false);
    }, [address]);

    useEffect(() => {
        fetchProfile();
        const interval = setInterval(() => fetchProfile(), 10000);
        return () => clearInterval(interval);
    }, [fetchProfile, refreshTrigger]);

    if (!profile && isLoading) return (
        <div className="h-32 bg-surface/50 rounded-2xl animate-pulse border border-border/50 mb-8" />
    );

    if (!profile) return null;

    const rewardsFormatted = (parseInt(profile.total_pending_rewards) / Math.pow(10, NETWORK_CONFIG.paymentDecimals)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    });

    const StatCard = ({ label, value, subtext, icon: Icon, colorClass, bgClass, borderClass }: any) => (
        <div className={`
            relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 group hover:shadow-lg
            ${bgClass} ${borderClass}
        `}>
            {/* Background Icon Watermark */}
            <div className={`absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500`}>
                <Icon size={80} strokeWidth={1} />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg bg-black/20 backdrop-blur-sm ${colorClass}`}>
                        <Icon size={14} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">{label}</span>
                </div>

                <div>
                    <div className={`text-2xl lg:text-3xl font-black font-mono tracking-tight ${colorClass}`}>
                        {value}
                    </div>
                    {subtext && (
                        <div className="text-[12px] font-medium text-textSecondary opacity-80 mt-1">
                            {subtext}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative mb-4 mt-4">


            {/* Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                {/* 1. Colony Size */}
                <StatCard
                    label="Your Shrooms"
                    subtext="Your shroom cluster size"
                    value={profile.total_mushrooms}
                    icon={Sprout}
                    colorClass="text-emerald-400"
                    bgClass="bg-gradient-to-br from-emerald-500/10 to-emerald-900/5"
                    borderClass="border-emerald-500/20"
                />

                {/* 2. Total Shares */}
                <StatCard
                    label="Total Power"
                    value={parseInt(profile.total_shares).toLocaleString()}
                    subtext="Your shroom's combined shares"
                    icon={Zap}
                    colorClass="text-blue-400"
                    bgClass="bg-gradient-to-br from-blue-500/10 to-blue-900/5"
                    borderClass="border-blue-500/20"
                />

                {/* 3. Strongest */}
                <StatCard
                    label="Alpha Strain"
                    value={profile.best_mushroom_id ? `#${profile.best_mushroom_id}` : 'N/A'}
                    subtext="Your highest single power shroom"
                    icon={Crown}
                    colorClass="text-purple-400"
                    bgClass="bg-gradient-to-br from-purple-500/10 to-purple-900/5"
                    borderClass="border-purple-500/20"
                />

                {/* 4. Rewards */}
                <StatCard
                    label="Accrued Value"
                    value={
                        <div className="flex items-baseline gap-1">
                            {rewardsFormatted} <span className="text-sm font-normal text-textSecondary">{NETWORK_CONFIG.paymentSymbol}</span>
                        </div>
                    }
                    subtext={
                        <span className="flex items-center gap-1">
                            <TrendingUp size={10} /> Est. pre-weather
                        </span>
                    }
                    icon={Coins}
                    colorClass="text-yellow-400"
                    bgClass="bg-gradient-to-br from-yellow-500/10 to-yellow-900/5"
                    borderClass="border-yellow-500/20"
                />

            </div>
        </div>
    );
};