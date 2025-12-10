import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { shroomService, TraitExtension } from '../services/shroomService';
import { MushroomRenderer } from './MushroomRenderer';
import { Loader2 } from 'lucide-react';

interface Props {
    address: string;
    excludeId: string;
    parentAGenome: number[]; // NEW: We need Parent A's genes to calculate the match
    onSelect: (id: string, traits: TraitExtension) => void;
    selectedId: string | null;
}

export const PartnerSelector: React.FC<Props> = ({
    address,
    excludeId,
    parentAGenome,
    onSelect,
    selectedId
}) => {
    const [tokens, setTokens] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [previews, setPreviews] = useState<Record<string, TraitExtension>>({});

    // Helper: Calculate Match % (0-100)
    const calculateMatch = useCallback((genomeB: number[] | undefined) => {
        if (!parentAGenome || !genomeB || genomeB.length === 0) return 0;

        let matches = 0;
        for (let i = 0; i < 8; i++) {
            if ((parentAGenome[i] || 0) === (genomeB[i] || 0)) matches++;
        }
        return Math.round((matches / 8) * 100);
    }, [parentAGenome]);

    useEffect(() => {
        const loadTokens = async () => {
            const owned = await shroomService.getTokensOwned(address);
            // Filter out self
            const candidates = owned.filter(id => id !== excludeId);
            setTokens(candidates);
            setLoading(false);

            // Lazy load traits for preview
            candidates.forEach(async (id) => {
                const t = await shroomService.getShroomTraits(id);
                if (t) setPreviews(prev => ({ ...prev, [id]: t }));
            });
        };
        loadTokens();
    }, [address, excludeId]);

    // Sort tokens based on match percentage
    // If traits aren't loaded yet, they go to the bottom
    const sortedTokens = useMemo(() => {
        return [...tokens].sort((a, b) => {
            const traitsA = previews[a];
            const traitsB = previews[b];

            // If we don't have data yet, push to bottom
            if (!traitsA) return 1;
            if (!traitsB) return -1;

            const matchA = calculateMatch(traitsA.genome);
            const matchB = calculateMatch(traitsB.genome);

            // Sort Descending (High Match -> Low Match)
            return matchB - matchA;
        });
    }, [tokens, previews, calculateMatch]);

    if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {sortedTokens.map(id => {
                const trait = previews[id];
                const matchPct = trait ? calculateMatch(trait.genome) : 0;

                // Color code the percentage
                const pctColor = matchPct > 70 ? 'text-green-400' : matchPct > 30 ? 'text-yellow-400' : 'text-orange-400';

                return (
                    <button
                        key={id}
                        onClick={() => trait && onSelect(id, trait)}
                        className={`relative rounded-xl border transition-all overflow-hidden group
                        ${selectedId === id
                                ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                                : 'border-border bg-background hover:border-primary/50'
                            }`}
                    >
                        {trait ? (
                            <div className="p-2">
                                {/* Match Percentage Badge */}
                                <div className="absolute top-1 right-1 z-10 bg-black/70 backdrop-blur-sm px-1.5  rounded-md border border-white/10 shadow-sm">
                                    <span className={`text-[10px] font-mono font-bold ${pctColor}`}>
                                        {matchPct}%
                                    </span>
                                </div>

                                <div className="w-full aspect-square mb-1">
                                    <MushroomRenderer traits={trait} minimal />
                                </div>
                                <div className="text-xs font-bold text-center text-text">#{id}</div>
                            </div>
                        ) : (
                            <div className="h-20 flex items-center justify-center">
                                <Loader2 size={16} className="animate-spin text-textSecondary" />
                            </div>
                        )}
                    </button>
                );
            })}

            {tokens.length === 0 && (
                <div className="col-span-3 text-center py-4 text-sm text-textSecondary">
                    No other mushrooms found. Mint another to breed!
                </div>
            )}
        </div>
    );
};