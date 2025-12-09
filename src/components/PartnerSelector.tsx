import React, { useEffect, useState } from 'react';
import { shroomService, TraitExtension } from '../services/shroomService';
import { MushroomRenderer } from './MushroomRenderer';
import { Loader2, Plus } from 'lucide-react';

interface Props {
    address: string;
    excludeId: string; // The ID of Parent A (can't breed with self)
    onSelect: (id: string, traits: TraitExtension) => void;
    selectedId: string | null;
}

export const PartnerSelector: React.FC<Props> = ({ address, excludeId, onSelect, selectedId }) => {
    const [tokens, setTokens] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [previews, setPreviews] = useState<Record<string, TraitExtension>>({});

    useEffect(() => {
        const loadTokens = async () => {
            const owned = await shroomService.getTokensOwned(address);
            setTokens(owned.filter(id => id !== excludeId));
            setLoading(false);

            // Lazy load traits for preview
            owned.forEach(async (id) => {
                if (id !== excludeId) {
                    const t = await shroomService.getShroomTraits(id);
                    if (t) setPreviews(prev => ({ ...prev, [id]: t }));
                }
            });
        };
        loadTokens();
    }, [address, excludeId]);

    if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {tokens.sort((a, b) => parseInt(a) - parseInt(b)).map(id => (
                <button
                    key={id}
                    onClick={() => previews[id] && onSelect(id, previews[id])}
                    className={`relative rounded-xl border transition-all overflow-hidden group
            ${selectedId === id
                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                            : 'border-border bg-background hover:border-primary/50'
                        }`}
                >
                    {previews[id] ? (
                        <div className="p-2">
                            <div className="w-full aspect-square mb-1">
                                <MushroomRenderer traits={previews[id]} minimal />
                            </div>
                            <div className="text-xs font-bold text-center text-text">#{id}</div>
                        </div>
                    ) : (
                        <div className="h-20 flex items-center justify-center">
                            <Loader2 size={16} className="animate-spin text-textSecondary" />
                        </div>
                    )}
                </button>
            ))}

            {tokens.length === 0 && (
                <div className="col-span-3 text-center py-4 text-sm text-textSecondary">
                    No other mushrooms found. Mint another to breed!
                </div>
            )}
        </div>
    );
};