import React from 'react';
import { Dna, Sparkles } from 'lucide-react';

interface Props {
    genome: number[];
    baseStats: { base_cap: number; base_stem: number; base_spores: number };
}

// Configuration for the Gene Slots
// We separate the outer container styles from the inner "nucleus" styles
const GENE_STYLES = [
    // 0: Rot (Gray - Dull, broken glass look)
    {
        container: 'bg-gray-900/30 border-gray-700/50 hover:border-gray-600',
        nucleus: 'bg-gray-700/50 w-2 h-2',
        glow: 'shadow-none',
        name: 'Rot',
        textColor: 'text-gray-500'
    },
    // 1: Toxin (Red - Aggressive glow)
    {
        container: 'bg-red-900/20 border-red-500/50 hover:border-red-400 hover:bg-red-500/10',
        nucleus: 'bg-red-500 w-3 h-3 shadow-[0_0_8px_rgba(239,68,68,0.8)]',
        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]',
        name: 'Toxin',
        textColor: 'text-red-400'
    },
    // 2: Chitin (Green - Structural/Organic glow)
    {
        container: 'bg-emerald-900/20 border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-500/10',
        nucleus: 'bg-emerald-500 w-3 h-3 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]',
        name: 'Chitin',
        textColor: 'text-emerald-400'
    },
    // 3: Phosphor (Blue - Energy glow)
    {
        container: 'bg-cyan-900/20 border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/10',
        nucleus: 'bg-cyan-400 w-3 h-3 shadow-[0_0_8px_rgba(34,211,238,0.8)]',
        glow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]',
        name: 'Phosphor',
        textColor: 'text-cyan-400'
    },
    // 4: Primordial (Gold - Pulsing, intense)
    {
        container: 'bg-yellow-900/30 border-yellow-400/80 hover:border-yellow-200 hover:bg-yellow-500/20 animate-pulse-slow',
        nucleus: 'bg-yellow-300 w-4 h-4 rotate-45 shadow-[0_0_12px_rgba(253,224,71,1)]',
        glow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)]',
        name: 'Primordial',
        textColor: 'text-yellow-400'
    },
];

export const GeneticsDisplay: React.FC<Props> = ({ genome, baseStats }) => {
    // Ensure we always have 8 slots visually
    const slots = [...(genome || []), 0, 0, 0, 0, 0, 0, 0, 0].slice(0, 8);

    return (
        <div className="bg-surface/50 border border-border rounded-2xl p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-text flex items-center gap-2 mr-2">
                    <Dna size={16} className="text-primary" />
                </h3>
                <div className="flex gap-3 text-xs font-mono bg-black/20 px-3 py-1 rounded-lg border border-border/30">
                    <span className="text-red-400 font-semibold">Cap +{baseStats.base_cap}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-emerald-400 font-semibold">Stem +{baseStats.base_stem}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-cyan-400 font-semibold">Spore +{baseStats.base_spores}</span>
                </div>
            </div>

            <div className="flex justify-between gap-3 ">
                {slots.map((gene, idx) => {
                    const style = GENE_STYLES[gene] || GENE_STYLES[0];

                    return (
                        <div key={idx} className="group relative flex-1 aspect-square">
                            {/* Connection Line (Visual Connector between genes) */}
                            {idx < 7 && (
                                <div className="absolute top-1/2 -right-4 w-5 h-[1px] bg-border/30 -z-10 group-hover:bg-primary/30 transition-colors" />
                            )}

                            {/* The Container Slot */}
                            <div
                                className={`w-full h-full rounded-xl border-2 backdrop-blur-md flex items-center justify-center transition-all duration-300 ${style.container} ${style.glow}`}
                            >
                                {/* The "Nucleus" (Inner Genetic Material) */}
                                <div className={`rounded-full transition-all duration-500 group-hover:scale-125 ${style.nucleus}`} />
                            </div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-black/90 border border-border/50 backdrop-blur-xl text-white text-xs rounded-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none z-20 whitespace-nowrap shadow-xl">
                                <div className="font-bold mb-0.5 text-center">Slot {idx + 1}</div>
                                <div className={`${style.textColor} font-semibold flex items-center gap-1 justify-center`}>
                                    {gene === 4 && <Sparkles size={10} />}
                                    {style.name}
                                </div>
                                {/* Arrow at bottom of tooltip */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {slots.includes(4) && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-yellow-400 font-bold bg-yellow-500/10 border border-yellow-500/20 rounded-lg py-2 animate-pulse">
                    <Sparkles size={14} />
                    <span>Primordial Gene Active: Universal Stat Bonus</span>
                    <Sparkles size={14} />
                </div>
            )}
        </div>
    );
};