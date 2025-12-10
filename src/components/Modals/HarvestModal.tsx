import React from 'react';
import { Loader2, AlertTriangle, Sprout, X, Check } from 'lucide-react';

interface HarvestStats {
    count: number;
    totalRewards: string;
    sacrificedStats: {
        cap: number;
        stem: number;
        spores: number;
    };
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean; // For the transaction step
    isPreparing: boolean; // For the trait fetching step
    stats: HarvestStats | null;
}

export const HarvestModal: React.FC<Props> = ({
    isOpen, onClose, onConfirm, isLoading, isPreparing, stats
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">

                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Sprout className="text-primary" size={20} />
                        Harvest Colony
                    </h3>
                    <button onClick={onClose} disabled={isLoading} className="text-textSecondary hover:text-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {isPreparing || !stats ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-textSecondary">
                            <Loader2 className="animate-spin text-primary" size={32} />
                            <p className="text-sm">Analyzing Volatile Stats...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Box */}
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                                <span className="text-textSecondary text-xs uppercase font-bold tracking-wider">Total Yield</span>
                                <div className="text-3xl font-mono font-bold text-primary mt-1">
                                    {parseFloat(stats.totalRewards).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </div>
                                <div className="text-xs text-primary/70 mt-1">
                                    Harvesting {stats.count} Mushrooms
                                </div>
                            </div>

                            {/* Sacrifice Stats */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 text-sm text-textSecondary">
                                    <AlertTriangle size={14} className="text-orange-400" />
                                    <span>Volatile Stats to be Reset:</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-black/20 rounded-lg p-2 text-center border border-white/5">
                                        <div className="text-red-400 font-bold font-mono text-lg">{stats.sacrificedStats.cap}</div>
                                        <div className="text-[10px] uppercase text-textSecondary">Cap</div>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-2 text-center border border-white/5">
                                        <div className="text-green-400 font-bold font-mono text-lg">{stats.sacrificedStats.stem}</div>
                                        <div className="text-[10px] uppercase text-textSecondary">Stem</div>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-2 text-center border border-white/5">
                                        <div className="text-blue-400 font-bold font-mono text-lg">{stats.sacrificedStats.spores}</div>
                                        <div className="text-[10px] uppercase text-textSecondary">Spores</div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-[14px] text-textSecondary text-center italic bg-black/20 p-2 rounded">
                                Only mushrooms with 100%+ Canopy Efficiency are selected.
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/5 bg-black/20 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-xl font-bold text-sm bg-black/20 hover:bg-black/40 text-textSecondary transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading || isPreparing}
                        className="flex-1 py-3 rounded-xl font-bold text-sm bg-primary hover:bg-primary-hover text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                        Confirm Harvest
                    </button>
                </div>
            </div>
        </div>
    );
};