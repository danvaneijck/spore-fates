import React, { useCallback, useEffect, useState } from 'react';
import { Sun, CloudFog, TrendingUp, AlertTriangle, Zap, Info } from 'lucide-react';
import { WeatherInfoModal } from '../Modals/WeatherInfoModal';
import { EcosystemMetrics, shroomService } from '../../services/shroomService';


export const EcosystemWeather: React.FC = () => {
    // State for the modal
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    // Lifted State: Metrics now live here
    const [metrics, setMetrics] = useState<EcosystemMetrics | null>(null);

    const fetchMetrics = useCallback(async () => {
        const data = await shroomService.getEcosystemMetrics();
        setMetrics(data);
    }, []);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(() => fetchMetrics(), 10000);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    if (!metrics) return null;

    const renderCard = (
        label: string,
        value: string,
        theme: 'red' | 'green' | 'blue'
    ) => {
        const multiplier = parseFloat(value);
        const isShadowZone = multiplier < 0.8;

        const styles = {
            red: {
                text: 'text-red-400',
                bg: 'bg-red-500/5',
                border: 'border-red-500/20',
                shadow: 'shadow-red-500/10',
                glow: 'shadow-[0_0_15px_rgba(248,113,113,0.3)]'
            },
            green: {
                text: 'text-emerald-400',
                bg: 'bg-emerald-500/5',
                border: 'border-emerald-500/20',
                shadow: 'shadow-emerald-500/10',
                glow: 'shadow-[0_0_15px_rgba(52,211,153,0.3)]'
            },
            blue: {
                text: 'text-cyan-400',
                bg: 'bg-cyan-500/5',
                border: 'border-cyan-500/20',
                shadow: 'shadow-cyan-500/10',
                glow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]'
            }
        };

        const currentStyle = styles[theme];

        return (
            <div className={`
                relative overflow-hidden rounded-2xl border transition-all duration-300 group
                ${isShadowZone
                    ? 'bg-surface/50 border-red-500/30'
                    : `${currentStyle.bg} ${currentStyle.border} hover:border-opacity-50 hover:shadow-lg ${currentStyle.shadow}`
                }
            `}>
                {!isShadowZone && (
                    <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-20 ${currentStyle.bg.replace('/5', '/30')}`} />
                )}

                <div className="p-4 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-bold uppercase tracking-widest ${isShadowZone ? 'text-textSecondary' : 'text-text'}`}>
                            {label}
                        </span>
                        {isShadowZone ? (
                            <CloudFog size={16} className="text-red-500" />
                        ) : (
                            <div className={`w-2 h-2 rounded-full ${currentStyle.glow} ${theme === 'red' ? 'bg-red-500' : theme === 'green' ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
                        )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-4">
                        <span className={`text-3xl font-black font-mono tracking-tighter ${isShadowZone ? 'text-textSecondary opacity-50' : currentStyle.text}`}>
                            {multiplier.toFixed(2)}
                        </span>
                        <span className={`text-sm font-bold opacity-60 ${isShadowZone ? 'text-textSecondary' : currentStyle.text}`}>x</span>
                    </div>

                    <div className={`
                        flex items-center gap-2 text-[10px] font-bold uppercase py-1.5 px-2.5 rounded-lg w-fit
                        ${isShadowZone
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-black/20 text-textSecondary border border-white/5'}
                    `}>
                        {isShadowZone ? (
                            <>
                                <AlertTriangle size={12} />
                                <span>Shadow Zone (0%)</span>
                            </>
                        ) : (
                            <>
                                <TrendingUp size={12} className={currentStyle.text} />
                                <span>Active</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-textSecondary uppercase tracking-wider flex items-center gap-2">
                        <Sun size={16} className="text-yellow-500" />
                        Current Canopy Weather
                    </h3>

                    {/* INFO BUTTON */}
                    <button
                        onClick={() => setIsInfoOpen(true)}
                        className="text-textSecondary hover:text-primary transition-colors p-1"
                        title="How does weather work?"
                    >
                        <Info size={14} />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <Zap size={10} className="text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase">Live</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {renderCard('Cap', metrics.cap_multiplier, 'red')}
                {renderCard('Stem', metrics.stem_multiplier, 'green')}
                {renderCard('Spores', metrics.spores_multiplier, 'blue')}
            </div>

            {/* MODAL */}
            <WeatherInfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
        </div>
    );
};