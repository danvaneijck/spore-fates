import React from 'react';
import { Dna } from 'lucide-react';

interface Props {
    genome: number[];
    baseStats: { cap: number; stem: number; spores: number };
}

// Gene Type Mapping
// 0: Rot (Gray), 1: Cap (Red), 2: Stem (Green), 3: Spores (Blue), 4: Primordial (Gold)
const GENE_COLORS = [
    'bg-gray-600 border-gray-500', // 0
    'bg-red-500 border-red-400',   // 1
    'bg-green-500 border-green-400', // 2
    'bg-blue-500 border-blue-400', // 3
    'bg-yellow-400 border-yellow-200 shadow-[0_0_10px_rgba(250,204,21,0.5)]', // 4
];

const GENE_NAMES = ['Rot', 'Toxin', 'Chitin', 'Phosphor', 'Primordial'];

export const GeneticsDisplay: React.FC<Props> = ({ genome, baseStats }) => {
    // Ensure we always have 8 slots visually
    const slots = [...(genome || []), 0, 0, 0, 0, 0, 0, 0, 0].slice(0, 8);

    return (
        <div className="bg-surface/50 border border-border rounded-2xl p-4 mb-6">
            <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-2">
                <Dna size={16} className="text-primary" /> Genetic Sequence
            </h3>
            <div className="flex items-center justify-between mb-4">

                <div className="flex gap-3 text-xs font-mono">
                    <span className="text-red-400">Base Cap: +{baseStats.cap}</span>
                    <span className="text-green-400">Base Stem: +{baseStats.stem}</span>
                    <span className="text-blue-400">Base Spores: +{baseStats.spores}</span>
                </div>
            </div>

            <div className="flex justify-between gap-2">
                {slots.map((gene, idx) => (
                    <div key={idx} className="group relative flex-1 aspect-square">
                        <div
                            className={`w-full h-full rounded-lg border-2 ${GENE_COLORS[gene] || GENE_COLORS[0]} transition-transform hover:scale-105`}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                            Slot {idx + 1}: {GENE_NAMES[gene] || 'Unknown'}
                        </div>
                    </div>
                ))}
            </div>

            {slots.includes(4) && (
                <div className="mt-3 text-xs text-yellow-400 text-center font-bold animate-pulse">
                    ✨ Primordial Genes Detected - Ascension Possible ✨
                </div>
            )}
        </div>
    );
};