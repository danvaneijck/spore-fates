import React from 'react';
import { Trophy, Crown, Shield, Medal, Star } from 'lucide-react';

interface Props {
    shares: number; // The calculated share power
    size?: 'sm' | 'lg';
}

export const RankBadge: React.FC<Props> = ({ shares, size = 'lg' }) => {
    let tier = { label: 'F', name: 'Sporeling', color: 'bg-gray-500', border: 'border-gray-400', icon: <Star size={12} /> };

    if (shares > 700) tier = { label: 'S', name: 'APEX', color: 'bg-yellow-500', border: 'border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.6)]', icon: <Crown size={14} /> };
    else if (shares > 500) tier = { label: 'A', name: 'Warlord', color: 'bg-red-600', border: 'border-red-400', icon: <Trophy size={14} /> };
    else if (shares > 300) tier = { label: 'B', name: 'Mystic', color: 'bg-purple-600', border: 'border-purple-400', icon: <Shield size={14} /> };
    else if (shares > 150) tier = { label: 'C', name: 'Hunter', color: 'bg-blue-600', border: 'border-blue-400', icon: <Medal size={14} /> };
    else if (shares > 50) tier = { label: 'D', name: 'Forager', color: 'bg-emerald-600', border: 'border-emerald-400', icon: <Shield size={14} /> };

    if (size === 'sm') {
        return (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-white ${tier.color} ${tier.border} border`}>
                {tier.icon} <span>{tier.label}-Rank</span>
            </div>
        );
    }

    return (
        <div className={`relative flex items-center gap-3 px-4 py-2 rounded-xl text-white ${tier.color} border-2 ${tier.border} transition-all duration-300`}>
            <div className="flex flex-col items-center">
                <span className="text-xs uppercase opacity-80 tracking-wider">Rank</span>
                <span className="text-2xl font-black italic leading-none">{tier.label}</span>
            </div>
            <div className="h-8 w-[1px] bg-white/30"></div>
            <div>
                <div className="text-xs uppercase opacity-80 font-semibold">{tier.name}</div>
                <div className="text-[10px] font-mono opacity-90">Power: {shares}</div>
            </div>

            {/* Decorative Glow for High Ranks */}
            {shares > 500 && (
                <div className="absolute inset-0 bg-white/10 blur-lg rounded-xl animate-pulse"></div>
            )}
        </div>
    );
};