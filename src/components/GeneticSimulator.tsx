import React, { useState, useEffect } from 'react';
import { Activity, Zap, AlertTriangle } from 'lucide-react';

interface Props {
    genomeA: number[];
    genomeB: number[];
}

// Reusing your Gene Styles for consistency (Small variant)
const GENE_STYLES = [
    { color: 'bg-gray-700/50 border-gray-600', glow: 'shadow-none' },           // 0: Rot
    { color: 'bg-red-500 border-red-400', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.6)]' },   // 1: Cap
    { color: 'bg-green-500 border-green-400', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.6)]' }, // 2: Stem
    { color: 'bg-cyan-500 border-cyan-400', glow: 'shadow-[0_0_10px_rgba(34,211,238,0.6)]' },  // 3: Spores
    { color: 'bg-yellow-400 border-yellow-200', glow: 'shadow-[0_0_15px_rgba(250,204,21,0.9)]' }, // 4: Primordial
];

export const GeneticSimulator: React.FC<Props> = ({ genomeA, genomeB }) => {
    const [simulatedGenome, setSimulatedGenome] = useState<number[]>(Array(8).fill(0));
    const [stats, setStats] = useState({ red: 0, green: 0, blue: 0 });

    // Simulation Loop
    useEffect(() => {
        // Run a simulation every 150ms to create a "flux" effect
        const interval = setInterval(() => {
            const tempGenome: number[] = [];
            let r = 0, g = 0, b = 0;

            for (let i = 0; i < 8; i++) {
                // 1. Roll for Mutation (5%)
                const isMutation = Math.random() < 0.05;

                let gene = 0;
                if (isMutation) {
                    // 90% Rot, 10% Gold
                    gene = Math.random() < 0.1 ? 4 : 0;
                } else {
                    // 2. Inheritance (50/50)
                    const geneA = genomeA[i] || 0;
                    const geneB = genomeB[i] || 0;
                    gene = Math.random() > 0.5 ? geneA : geneB;
                }

                tempGenome.push(gene);

                // Track aggregate stats for this frame
                if (gene === 1 || gene === 4) r++;
                if (gene === 2 || gene === 4) g++;
                if (gene === 3 || gene === 4) b++;
            }

            setSimulatedGenome(tempGenome);
            setStats({ red: r, green: g, blue: b });
        }, 500); // Speed of the flash

        return () => clearInterval(interval);
    }, [genomeA, genomeB]);

    // Calculate "Safety" of the breed (how many slots match vs conflict)
    const calculateStability = () => {
        let matches = 0;
        for (let i = 0; i < 8; i++) {
            if ((genomeA[i] || 0) === (genomeB[i] || 0)) matches++;
        }
        const pct = Math.round((matches / 8) * 100);
        return { pct, label: pct > 70 ? 'Stable' : pct > 30 ? 'Volatile' : 'Chaotic' };
    };

    const stability = calculateStability();

    return (
        <div className="mb-6 bg-black/20 rounded-xl p-4 border border-purple-500/30 relative overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-purple-400 animate-pulse" />
                    <h4 className="text-sm font-bold text-text">Simulating Outcomes...</h4>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-textSecondary">Stability:</span>
                    <span className={`${stability.pct > 50 ? 'text-green-400' : 'text-orange-400'} font-mono`}>
                        {stability.pct}% ({stability.label})
                    </span>
                </div>
            </div>

            {/* The Visualizer Strip */}
            <div className="flex gap-2 mb-4">
                {simulatedGenome.map((gene, idx) => {
                    const style = GENE_STYLES[gene] || GENE_STYLES[0];
                    return (
                        <div key={idx} className="flex-1 aspect-[3/4] bg-gray-900/50 rounded-lg p-1 border border-white/5">
                            <div className={`w-full h-full rounded transition-colors duration-100 ${style.color} ${style.glow}`} />
                        </div>
                    );
                })}
            </div>

            {/* Live Projected Stats */}
            <div className="grid grid-cols-3 gap-2 text-center bg-black/40 rounded-lg p-2 border border-white/5">
                <div className="flex flex-col">
                    <span className="text-[10px] text-textSecondary uppercase">Proj. Cap</span>
                    <span className="text-red-400 font-mono font-bold">+{stats.red >= 7 ? 6 : stats.red >= 5 ? 3 : stats.red >= 3 ? 1 : 0}</span>
                </div>
                <div className="flex flex-col border-l border-white/10">
                    <span className="text-[10px] text-textSecondary uppercase">Proj. Stem</span>
                    <span className="text-green-400 font-mono font-bold">+{stats.green >= 7 ? 6 : stats.green >= 5 ? 3 : stats.green >= 3 ? 1 : 0}</span>
                </div>
                <div className="flex flex-col border-l border-white/10">
                    <span className="text-[10px] text-textSecondary uppercase">Proj. Spore</span>
                    <span className="text-blue-400 font-mono font-bold">+{stats.blue >= 7 ? 6 : stats.blue >= 5 ? 3 : stats.blue >= 3 ? 1 : 0}</span>
                </div>
            </div>

            {/* Warning Overlay for Mutation */}
            <div className="absolute top-2 right-2 opacity-30">
                <Zap className="text-yellow-500 animate-[ping_3s_infinite]" size={12} />
            </div>

        </div>
    );
};