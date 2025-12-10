import React from 'react';
import { Award, Loader2, Lock, Unlock, ArrowUpCircle, AlertTriangle, Check, Crown, Zap } from 'lucide-react';
import { TraitExtension } from '../../services/shroomService';

interface Props {
    traits: TraitExtension;
    canAscend: boolean;
    onAscend: () => void;
    isLoading: boolean;
}

export const AscensionCard: React.FC<Props> = ({ traits, canAscend, onAscend, isLoading }) => {
    const isMaxed = traits.substrate === 4;

    // Helper for the 3 requirements
    const RequirementStat = ({ label, value }: { label: string, value: number }) => {
        const isMet = value >= 3;
        return (
            <div className={`
        relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-500
        ${isMet
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-black/20 border-white/5 opacity-60'}
      `}>
                {isMet && (
                    <div className="absolute top-1 right-1 text-amber-500 animate-scale-in">
                        <Check size={12} strokeWidth={4} />
                    </div>
                )}
                <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isMet ? 'text-amber-400' : 'text-textSecondary'}`}>
                    {label}
                </span>
                <div className="flex items-end gap-1">
                    <span className={`text-xl font-mono font-black ${isMet ? 'text-white' : 'text-white/50'}`}>
                        {Math.max(0, value)}
                    </span>
                    <span className="text-[10px] text-white/30 mb-1 font-bold">/ 3</span>
                </div>
            </div>
        );
    };

    return (
        <div className="relative overflow-hidden bg-surface rounded-3xl p-1 border border-border group">

            {/* Background Ambient Glow (Only when ready) */}
            {canAscend && (
                <div className="absolute inset-0 bg-amber-500/5 animate-pulse" />
            )}

            <div className="relative bg-surface/50 rounded-[22px] p-6 backdrop-blur-sm h-full flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${canAscend || isMaxed ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-textSecondary'}`}>
                            {isMaxed ? <Crown size={24} /> : <Award size={24} />}
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${canAscend ? 'text-amber-100' : 'text-text'}`}>
                                {isMaxed ? 'Apex Predator' : 'Ascension'}
                            </h3>
                            <p className="text-xs text-textSecondary">
                                {isMaxed ? 'Maximum evolution achieved' : 'Evolve substrate tier'}
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`
            px-3 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wide flex items-center gap-1.5
            ${isMaxed
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : canAscend
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                : 'bg-black/20 text-textSecondary border-white/5'}
          `}>
                        {isMaxed ? 'Max Level' : canAscend ? 'Ready' : 'Locked'}
                        {isMaxed ? <Crown size={12} /> : canAscend ? <Unlock size={12} /> : <Lock size={12} />}
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1">
                    {isMaxed ? (
                        <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-6 text-center">
                            <div className="text-purple-300 font-bold text-sm mb-1">Substrate Level 4 (Apex)</div>
                            <p className="text-xs text-purple-200/60">
                                You have reached the pinnacle of evolution. Your rewards multiplier is maximized.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">

                            {/* Requirements Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <RequirementStat label="Cap" value={traits.cap} />
                                <RequirementStat label="Stem" value={traits.stem} />
                                <RequirementStat label="Spores" value={traits.spores} />
                            </div>

                            {/* Info / Warning Box */}
                            <div className={`
                rounded-xl p-4 border text-xs leading-relaxed transition-all
                ${canAscend
                                    ? 'bg-amber-900/10 border-amber-500/30'
                                    : 'bg-black/20 border-white/5 text-textSecondary'}
              `}>
                                {canAscend ? (
                                    <div className="flex gap-3">
                                        <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                                        <div className="space-y-2">
                                            <p className="text-amber-200 font-medium">
                                                Ritual ready. <span className="text-white font-bold">20% Success Chance.</span>
                                            </p>
                                            <p className="opacity-70 text-amber-100">
                                                Ascension burns <b className="text-white">ALL</b> pending rewards and resets Volatile stats to 0, regardless of outcome.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 opacity-70">
                                        <ArrowUpCircle size={16} />
                                        <span>Reach <b className="text-white">+3</b> in all stats to attempt ascension.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                {!isMaxed && (
                    <div className="mt-6">
                        <button
                            onClick={onAscend}
                            disabled={isLoading || !canAscend}
                            className={`
                relative w-full py-4 rounded-xl font-bold text-sm tracking-wider uppercase transition-all overflow-hidden group/btn
                ${canAscend
                                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-900/20 hover:shadow-amber-500/30 hover:scale-[1.02]'
                                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'}
              `}
                        >
                            {/* Shine Effect */}
                            {canAscend && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                            )}

                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 size={18} className="animate-spin" />
                                    Channeling...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {canAscend && <Zap size={18} className="fill-white" />}
                                    {canAscend ? 'Begin Ascension' : 'Requirements Not Met'}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};