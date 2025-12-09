import React, { useState, useEffect } from 'react';
import { MushroomRenderer } from './MushroomRenderer';
import { TraitExtension } from '../services/shroomService';
import { X, ArrowRight, Sparkles } from 'lucide-react';
import { GeneticsDisplay } from './GeneticsDisplay';
import confetti from 'canvas-confetti';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    childId: string | null;
    childTraits: TraitExtension | null;
}

export const NewMushroomReveal: React.FC<Props> = ({ isOpen, onClose, childId, childTraits }) => {
    const [stage, setStage] = useState<'incubating' | 'ready' | 'revealed'>('incubating');

    useEffect(() => {
        if (isOpen && childTraits) {
            setStage('incubating');
            // Wait for "incubation"
            const timer = setTimeout(() => {
                setStage('ready');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, childTraits]);

    const handleReveal = () => {
        setStage('revealed');
        // Fire confetti explosion
        const duration = 15 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 60 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        // Fire a burst immediately
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#a855f7', '#ec4899', '#22c55e']
        });
    };

    if (!isOpen || !childTraits) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            {/* CSS for custom animations */}
            <style>{`
                @keyframes floatSpore {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
                    33% { transform: translate(20px, -30px) scale(1.2); opacity: 1; }
                    66% { transform: translate(-15px, 20px) scale(0.9); opacity: 0.8; }
                }
                @keyframes converge {
                    0% { transform: scale(1); filter: blur(0px); }
                    50% { transform: scale(0.8); filter: blur(2px); }
                    100% { transform: scale(1.1); filter: blur(0px); box-shadow: 0 0 50px rgba(168,85,247,0.6); }
                }
                @keyframes sproutUp {
                    0% { transform: translateY(120%) scale(0.2); opacity: 0; }
                    40% { transform: translateY(10%) scale(0.8); opacity: 1; }
                    70% { transform: translateY(-5%) scale(1.05); } 
                    100% { transform: translateY(0) scale(1); }
                }
                @keyframes soilGlow {
                    0% { opacity: 0; transform: scaleX(0.5); }
                    100% { opacity: 1; transform: scaleX(1); }
                }
            `}</style>

            <div className="w-full max-w-lg relative">

                {/* Close Button */}
                {stage === 'revealed' && (
                    <button
                        onClick={onClose}
                        className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                    >
                        <X size={24} />
                    </button>
                )}

                <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/40">

                    {/* Header */}
                    <div className="p-6 text-center border-b border-border bg-black/40">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            {stage === 'incubating' && <Sparkles size={16} className="text-purple-400 animate-pulse" />}
                            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-white">
                                {stage === 'revealed' ? 'New Strain Discovered!' : 'Genetic Synthesis'}
                            </h2>
                        </div>
                        <p className="text-textSecondary text-xs tracking-wider uppercase">
                            {stage === 'revealed'
                                ? `Specimen #${childId} Successfully Cultivated`
                                : stage === 'ready' ? 'DNA Sequence Stabilized' : 'Fusing Spores...'}
                        </p>
                    </div>

                    {/* Main Animation Stage */}
                    <div className="relative h-80 w-full bg-gradient-to-b from-black/60 to-purple-900/20 overflow-hidden flex items-center justify-center">

                        {/* STAGE 1 & 2: FLOATING SPORES */}
                        {stage !== 'revealed' && (
                            <div
                                onClick={stage === 'ready' ? handleReveal : undefined}
                                className={`relative w-64 h-64 flex items-center justify-center cursor-pointer transition-all duration-700
                                    ${stage === 'ready' ? 'scale-110' : 'scale-100'}`}
                            >
                                {/* The Spores */}
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`absolute rounded-full blur-[1px]
                                            ${i % 3 === 0 ? 'bg-purple-400 w-4 h-4' : i % 3 === 1 ? 'bg-pink-400 w-3 h-3' : 'bg-blue-400 w-2 h-2'}
                                        `}
                                        style={{
                                            top: `${50 + Math.sin(i) * 30}%`,
                                            left: `${50 + Math.cos(i) * 30}%`,
                                            animation: `floatSpore ${3 + (i % 3)}s infinite ease-in-out alternate`,
                                            animationDelay: `${i * 0.2}s`,
                                            transition: 'all 1s ease'
                                        }}
                                    />
                                ))}

                                {/* Core Glow */}
                                <div className={`absolute w-32 h-32 bg-purple-600/20 rounded-full blur-3xl transition-all duration-1000
                                    ${stage === 'ready' ? 'opacity-100 scale-150 bg-purple-500/30' : 'opacity-50 scale-100'}`}
                                />

                                {stage === 'ready' && (
                                    <div className="absolute inset-0 flex items-center justify-center z-20 animate-in fade-in zoom-in duration-300">
                                        <div className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-bold text-sm shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse">
                                            CLICK TO SPROUT
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STAGE 3: SPROUTING ANIMATION */}
                        {stage === 'revealed' && (
                            <div className="relative w-full h-full flex items-end justify-center pb-8">
                                {/* The Soil/Ground Glow */}
                                <div className="absolute bottom-0 w-48 h-12 bg-purple-500/30 blur-2xl rounded-[50%]"
                                    style={{ animation: 'soilGlow 1s ease-out forwards' }}
                                />

                                {/* The Mushroom Container */}
                                <div
                                    className="relative z-10 w-56 h-56 origin-bottom"
                                    style={{ animation: 'sproutUp 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
                                >
                                    <MushroomRenderer traits={childTraits} />

                                    {/* Sparkle particles overlay */}
                                    <Sparkles size={24} className="absolute -top-4 -right-4 text-yellow-300 animate-spin-slow" />
                                    <Sparkles size={16} className="absolute top-1/2 -left-8 text-purple-300 animate-pulse" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats Panel (Only after reveal) */}
                    {stage === 'revealed' && (
                        <div className="p-6 bg-surface animate-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">

                            {/* Base Stats Summary */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <StatBox label="Base Cap" value={childTraits.base_cap} color="red" />
                                <StatBox label="Base Stem" value={childTraits.base_stem} color="green" />
                                <StatBox label="Base Spore" value={childTraits.base_spores} color="blue" />
                            </div>

                            {/* Genetics Strip */}
                            <div className="bg-background/50 rounded-xl p-4 border border-border mb-6">
                                <GeneticsDisplay genome={childTraits.genome} baseStats={childTraits} />
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={onClose}
                                    className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-600/20 group"
                                >
                                    Add to Colony <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper for the stat boxes
const StatBox = ({ label, value, color }: { label: string, value: number, color: string }) => {
    const styles: Record<string, string> = {
        red: 'text-red-400 bg-red-500/5 border-red-500/20',
        green: 'text-green-400 bg-green-500/5 border-green-500/20',
        blue: 'text-blue-400 bg-blue-500/5 border-blue-500/20',
    };

    return (
        <div className={`flex flex-col items-center p-3 rounded-xl border ${styles[color]}`}>
            <span className="text-[10px] text-textSecondary uppercase tracking-wider mb-1 font-semibold opacity-70">{label}</span>
            <div className="flex items-center gap-1">
                <span className="text-xl font-bold">+{value}</span>
                {value >= 6 && <Sparkles size={12} className="text-yellow-400" />}
            </div>
        </div>
    );
};