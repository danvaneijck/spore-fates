import React, { useEffect, useState } from 'react';
import { Coins, X, Sparkles } from 'lucide-react';
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
            // Generate random particles
            const newParticles = Array.from({ length: 50 }).map((_, i) => ({
                id: i,
                left: Math.random() * 100, // Random horizontal position
                delay: Math.random() * 0.5, // Random start delay
                duration: 1.5 + Math.random() * 1.5, // Random fall speed
                size: 4 + Math.random() * 8, // Random size
                type: Math.random() > 0.3 ? 'gold' : 'spore', // Mix of gold coins and spores
                swing: Math.random() * 40 - 20 // Random sway
            }));
            setParticles(newParticles);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        @keyframes fall {
          0% { transform: translateY(-50px) translateX(0) scale(0); opacity: 0; }
          10% { opacity: 1; transform: translateY(0) scale(1); }
          100% { transform: translateY(400px) translateX(var(--swing)) scale(0.8); opacity: 0; }
        }
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.2); }
          50% { box-shadow: 0 0 50px rgba(234, 179, 8, 0.6); }
        }
      `}</style>

            <div className="relative w-full max-w-md bg-surface border border-yellow-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-yellow-500/20 overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>

                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-textSecondary hover:text-text">
                    <X size={24} />
                </button>

                {/* The Mushroom Shaking Animation */}
                <div className="relative z-10 mb-6 flex justify-center">
                    <div style={{ animation: 'shake 2s ease-in-out infinite' }} className="relative">
                        {/* Simple SVG Mushroom */}
                        <svg width="120" height="120" viewBox="0 0 100 100">
                            {/* Stem */}
                            <path d="M40 50 Q35 90 20 95 L80 95 Q65 90 60 50 Z" fill="#e2e8f0" />
                            {/* Gills/Under */}
                            <ellipse cx="50" cy="50" rx="40" ry="10" fill="#7e22ce" />
                            {/* Cap */}
                            <path d="M10 50 Q50 -10 90 50 Z" fill="url(#capGrad)" />
                            {/* Spots */}
                            <circle cx="30" cy="30" r="5" fill="white" fillOpacity="0.3" />
                            <circle cx="70" cy="35" r="3" fill="white" fillOpacity="0.3" />
                            <circle cx="50" cy="20" r="6" fill="white" fillOpacity="0.3" />

                            <defs>
                                <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#7e22ce" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Glow behind */}
                        <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
                    </div>
                </div>

                {/* Falling Particles Container */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className={`absolute rounded-full flex items-center justify-center
                  ${p.type === 'gold' ? 'text-yellow-400' : 'bg-purple-400'}`}
                            style={{
                                left: `${p.left}%`,
                                top: '30%', // Start from middle (mushroom level)
                                width: p.type === 'spore' ? `${p.size}px` : 'auto',
                                height: p.type === 'spore' ? `${p.size}px` : 'auto',
                                animation: `fall ${p.duration}s linear forwards`,
                                animationDelay: `${p.delay}s`,
                                '--swing': `${p.swing}px`
                            } as any}
                        >
                            {p.type === 'gold' && <Coins size={p.size * 2} strokeWidth={1.5} />}
                        </div>
                    ))}
                </div>

                {/* Text Content */}
                <div className="relative z-20">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2">
                        Harvest Successful!
                    </h2>
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <span className="text-4xl font-bold text-text">+{amount}</span>
                        <span className="text-xl font-bold text-yellow-500">{NETWORK_CONFIG.paymentSymbol}</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20"
                    >
                        Collect
                    </button>
                </div>

            </div>
        </div>
    );
};