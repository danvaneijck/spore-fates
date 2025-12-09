import React from 'react';
import { CloudRain, Sun, Wind, CloudFog } from 'lucide-react';
import { EcosystemMetrics } from '../services/shroomService';

interface Props {
    metrics: EcosystemMetrics | null;
}

export const EcosystemWeather: React.FC<Props> = ({ metrics }) => {
    if (!metrics) return null;

    const renderCard = (label: string, value: string, icon: any, colorClass: string) => {
        const multiplier = parseFloat(value);
        const isShadowZone = multiplier < 0.8;

        return (
            <div className={`relative p-4 rounded-xl border ${isShadowZone ? 'border-red-500/50 bg-red-500/10' : 'border-border bg-surface'}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {icon}
                        <span className="font-semibold text-text">{label}</span>
                    </div>
                    <span className={`text-sm font-bold ${colorClass}`}>
                        {multiplier.toFixed(2)}x
                    </span>
                </div>

                {isShadowZone ? (
                    <div className="text-xs text-red-400 font-medium flex items-center gap-1">
                        <CloudFog size={12} /> SHADOW ZONE (0% Yield)
                    </div>
                ) : (
                    <div className="text-xs text-textSecondary">
                        Active Yield
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mb-6">
            <h3 className="text-sm font-bold text-textSecondary uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sun size={16} /> Current Canopy Weather
            </h3>
            <div className="grid grid-cols-3 gap-3">
                {renderCard('Cap', metrics.cap_multiplier, <div className="w-3 h-3 rounded-full bg-red-500" />, 'text-red-500')}
                {renderCard('Stem', metrics.stem_multiplier, <div className="w-3 h-3 rounded-full bg-green-500" />, 'text-green-500')}
                {renderCard('Spores', metrics.spores_multiplier, <div className="w-3 h-3 rounded-full bg-blue-500" />, 'text-blue-500')}
            </div>
        </div>
    );
};