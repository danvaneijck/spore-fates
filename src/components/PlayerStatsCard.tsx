import React, { useEffect, useState } from 'react';
import { shroomService, PlayerProfile } from '../services/shroomService';
import { NETWORK_CONFIG } from '../config';
import { User, PieChart, Coins, Crown } from 'lucide-react';

interface Props {
    address: string;
    refreshTrigger: number;
}

export const PlayerStatsCard: React.FC<Props> = ({ address, refreshTrigger }) => {
    const [profile, setProfile] = useState<PlayerProfile | null>(null);

    useEffect(() => {
        if (!address) return;
        const fetchProfile = async () => {
            // Calls the aggregator which handles the loop internally
            const data = await shroomService.getFullPlayerProfile(address);
            setProfile(data);
        };
        fetchProfile();
    }, [address, refreshTrigger]);

    if (!profile) return null;

    const rewardsFormatted = (parseInt(profile.total_pending_rewards) / Math.pow(10, NETWORK_CONFIG.paymentDecimals)).toFixed(2);

    return (
        <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
                <User className="text-primary" size={20} />
                <h3 className="text-lg font-bold text-text">My Colony Stats</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* Count */}
                <div className="bg-background rounded-xl p-3 border border-border/50">
                    <div className="text-xs text-textSecondary uppercase tracking-wider mb-1">Mushrooms</div>
                    <div className="text-xl font-bold text-text">{profile.total_mushrooms}</div>
                </div>

                {/* Shares */}
                <div className="bg-background rounded-xl p-3 border border-border/50">
                    <div className="text-xs text-textSecondary uppercase tracking-wider mb-1 flex items-center gap-1">
                        <PieChart size={12} /> Total Shares
                    </div>
                    <div className="text-xl font-bold text-blue-400">{profile.total_shares}</div>
                </div>

                {/* Best Shroom */}
                <div className="bg-background rounded-xl p-3 border border-border/50">
                    <div className="text-xs text-textSecondary uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Crown size={12} /> Strongest
                    </div>
                    <div className="text-xl font-bold text-purple-400">
                        {profile.best_mushroom_id ? `#${profile.best_mushroom_id}` : 'N/A'}
                    </div>
                </div>

                {/* Total Pending */}
                <div className="bg-background rounded-xl p-3 border border-border/50">
                    <div className="text-xs text-textSecondary uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Coins size={12} /> Total Pending
                    </div>
                    <div className="text-xl font-bold text-yellow-400">
                        {rewardsFormatted} <span className="text-sm">{NETWORK_CONFIG.paymentSymbol}</span>
                    </div>
                    <div className="text-[9px] text-textSecondary opacity-70">
                        *Pre-weather calculation
                    </div>
                </div>

            </div>
        </div>
    );
};