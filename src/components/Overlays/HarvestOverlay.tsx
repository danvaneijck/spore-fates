import React, { useEffect, useState } from 'react';
import { Coins, X, Sparkles, Check } from 'lucide-react';
import { NETWORK_CONFIG } from '../../config';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    amount: string;
}

export const HarvestOverlay: React.FC<Props> = ({ isOpen, onClose, amount }) => {
    const [particles, setParticles] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Generate falling particles (Coins + Spores)
            const newParticles = Array.from({ length: 40 }).map((_, i) => ({
                id: i,
                left: Math.random() * 100, // % position
                delay: Math.random() * 0.8, // Start delay
                duration: 1.5 + Math.random() * 1.5, // Fall speed
                size: 8 + Math.random() * 12, // Coin size
                rotation: Math.random() * 360, // Initial rotation
                swing: Math.random() * 100 - 50, // X-axis sway
                type: Math.random() > 0.4 ? 'gold' : 'sparkle'
            }));
            setParticles(newParticles);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <style>{`
                @keyframes bounce-shake {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    25% { transform: translateY(-5px) rotate(-3deg); }
                    50% { transform: translateY(0) rotate(0deg); }
                    75% { transform: translateY(-5px) rotate(3deg); }
                }
                @keyframes fall-tumble {
                    0% { transform: translateY(-100px) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(400px) translateX(var(--swing)) rotate(720deg); opacity: 0; }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes float-sparkle {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0; }
                    50% { transform: translateY(-20px) scale(1.5); opacity: 1; }
                }
            `}</style>

            <div
                className="relative w-full max-w-sm bg-[#1a1a1a] border-2 border-amber-500/30 rounded-[32px] p-1 text-center shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Inner Bezel */}
                <div className="relative bg-gradient-to-b from-[#2a2a2a] to-[#121212] rounded-[28px] p-8 overflow-hidden">

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors z-30"
                    >
                        <X size={20} />
                    </button>

                    {/* --- ANIMATION STAGE --- */}
                    <div className="relative z-10 h-48 flex items-center justify-center mb-4">

                        {/* Rotating Rays (Holy Light) */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                            <div className="w-[300px] h-[300px] bg-gradient-to-r from-amber-500/20 to-transparent rounded-full blur-3xl" />
                            <svg
                                className="w-[400px] h-[400px] text-amber-500/10 absolute animate-[spin-slow_10s_linear_infinite]"
                                viewBox="0 0 100 100"
                            >
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <path key={i} d="M50 50 L50 0 L55 50 Z" transform={`rotate(${i * 30} 50 50)`} fill="currentColor" />
                                ))}
                            </svg>
                        </div>

                        {/* The Golden Mushroom */}
                        <div style={{ animation: 'bounce-shake 0.5s ease-in-out infinite' }} className="relative z-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                            <svg width="140" height="140" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="goldStem" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#d97706" />
                                        <stop offset="50%" stopColor="#fbbf24" />
                                        <stop offset="100%" stopColor="#d97706" />
                                    </linearGradient>
                                    <radialGradient id="goldCap" cx="50%" cy="0%" r="100%">
                                        <stop offset="0%" stopColor="#fef3c7" />
                                        <stop offset="40%" stopColor="#f59e0b" />
                                        <stop offset="100%" stopColor="#b45309" />
                                    </radialGradient>
                                </defs>

                                {/* Stem */}
                                <path d="M42 55 Q38 90 25 95 L75 95 Q62 90 58 55 Z" fill="url(#goldStem)" />
                                {/* Gills Shadow */}
                                <ellipse cx="50" cy="55" rx="38" ry="10" fill="#78350f" />
                                {/* Cap */}
                                <path d="M10 55 Q50 -15 90 55 Z" fill="url(#goldCap)" />
                                {/* Shine */}
                                <ellipse cx="50" cy="25" rx="20" ry="10" fill="white" fillOpacity="0.2" />
                                {/* Sparkles */}
                                <circle cx="30" cy="40" r="2" fill="white" className="animate-pulse" />
                                <circle cx="70" cy="45" r="3" fill="white" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
                            </svg>
                        </div>

                    </div>

                    {/* --- TEXT CONTENT --- */}
                    <div className="relative z-20 space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                            <Sparkles size={12} /> Yield Harvested
                        </div>

                        <div className="flex flex-col items-center justify-center">
                            <span className="text-5xl font-black font-mono text-white tracking-tight drop-shadow-lg">
                                +{amount}
                            </span>
                            <span className="text-sm font-bold text-amber-500 mt-1 uppercase tracking-widest">
                                {NETWORK_CONFIG.paymentSymbol}
                            </span>
                        </div>

                        <div className="pt-8 w-full">
                            <button
                                onClick={onClose}
                                className="group relative w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="relative flex items-center justify-center gap-2">
                                    <Check size={20} strokeWidth={3} />
                                    <span>Claim Rewards</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};