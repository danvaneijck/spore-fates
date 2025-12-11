import React from 'react';
import { X, Scale, CloudFog, TrendingUp, Dna, AlertTriangle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const WeatherInfoModal: React.FC<Props> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-y-scroll max-h-screen  shadow-2xl animate-scale-in">

                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-text">
                        <Scale className="text-primary" size={20} />
                        Ecosystem Balance
                    </h3>
                    <button onClick={onClose} className="text-textSecondary hover:text-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 text-sm text-textSecondary">

                    {/* Intro */}
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <p className="leading-relaxed">
                            The Canopy Weather is a <strong>Global Supply & Demand</strong> system.
                            The ecosystem thrives when <b>Cap</b>, <b>Stem</b>, and <b>Spores</b> biomass are perfectly balanced (33% each).
                        </p>
                    </div>

                    {/* Mechanics Grid */}
                    <div className="space-y-4">

                        <div className="flex gap-4">
                            <div className="min-w-[40px] h-10 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                <TrendingUp size={20} className="text-green-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-text mb-1">Scarcity = High Yield</h4>
                                <p className="text-xs opacity-80">
                                    Traits that are rare in the global pool get a <strong>Multiplier Bonus</strong> (up to 5x). Holding these earns you significantly more rewards.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="min-w-[40px] h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                <CloudFog size={20} className="text-red-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-text mb-1">Oversupply = Shadow Zone</h4>
                                <p className="text-xs opacity-80">
                                    If a trait becomes too common (oversaturated), it enters the <strong>Shadow Zone</strong>. Mushrooms composed mostly of these traits earn <strong>0 rewards</strong> until balance is restored.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="min-w-[40px] h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <Dna size={20} className="text-purple-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-text mb-1">The Solution: Breeding</h4>
                                <p className="text-xs opacity-80">
                                    To fix the weather and escape the Shadow Zone, you must <strong>Breed Rare Genetics</strong>.
                                    creating mushrooms with the <i>under-represented</i> traits will shift the global balance back to equilibrium.
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Warning Footer */}
                    <div className="flex items-start gap-2 text-[11px] bg-black/20 p-3 rounded-lg border border-white/5">
                        <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                        <span>
                            <strong>Tip:</strong> If your mushroom is in the Shadow Zone, check the "Genetic Splicing" tab to breed it with a partner that has high-demand traits.
                        </span>
                    </div>

                </div>

                <div className="p-4 border-t border-white/5 bg-black/20">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl font-bold text-sm bg-surface hover:bg-white/5 text-text border border-white/10 transition-all"
                    >
                        Understood
                    </button>
                </div>
            </div>
        </div>
    );
};