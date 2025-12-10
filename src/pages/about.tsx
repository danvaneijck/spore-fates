import React from 'react';
import {
    Sprout,
    Dna,
    CloudRain,
    TrendingUp,
    Shield,
    Zap,
    GitMerge,
    ArrowLeft,
    AlertTriangle,
    Award,
    Calculator,
    Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SporeLogo } from '../components/Logo/SporeLogo';

export const About: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-20 animate-fade-in">

            {/* Header */}
            <div className="mb-12">
                <Link to="/" className="inline-flex items-center text-textSecondary hover:text-primary transition-colors mb-8 group">
                    <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Colony
                </Link>
                <div className='flex gap-4 items-center mb-6'>
                    <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                        <SporeLogo size={60} />
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-text tracking-tight mb-2">
                            The Spore Codex
                        </h1>
                        <p className="text-xl text-textSecondary">
                            The complete guide to genetic engineering, market dynamics, and ascension.
                        </p>
                    </div>
                </div>
            </div>

            {/* 1. Core Concept */}
            <section className="bg-surface/50 backdrop-blur-sm rounded-3xl p-8 border border-border mb-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                        <Sprout size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-text">The Basics</h2>
                </div>

                <p className="text-textSecondary leading-relaxed mb-8 text-lg">
                    SporeFates is a high-stakes strategy game where you evolve living NFT assets.
                    Your goal is to maximize your <strong>Share Power</strong> to claim the largest portion of the global yield.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/20 rounded-2xl p-6 border border-white/5 hover:border-primary/30 transition-colors">
                        <h3 className="font-bold text-lg text-text mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            Volatile Stats
                        </h3>
                        <p className="text-sm text-textSecondary leading-relaxed">
                            These range from <span className="text-red-400 font-mono">-3</span> to <span className="text-green-400 font-mono">+3</span>.
                            You manipulate them by <strong>Spinning</strong>. They are temporary and reset to 0 after you Harvest rewards (unless protected by perks).
                        </p>
                    </div>
                    <div className="bg-black/20 rounded-2xl p-6 border border-white/5 hover:border-primary/30 transition-colors">
                        <h3 className="font-bold text-lg text-text mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                            Base Stats
                        </h3>
                        <p className="text-sm text-textSecondary leading-relaxed">
                            These range from <span className="text-text font-mono">0</span> to <span className="text-yellow-400 font-mono">+10</span>.
                            Determined entirely by <strong>Genetics</strong>. These are permanent and provide a safe floor for your power, ensuring you always earn yield.
                        </p>
                    </div>
                </div>
            </section>

            {/* 2. Power Formula (Quadratic) */}
            <section className="bg-surface/50 backdrop-blur-sm rounded-3xl p-8 border border-border mb-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4 relative z-10">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500">
                        <Calculator size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-text">The Power Formula</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                    <div className="flex-1">
                        <p className="text-textSecondary mb-4">
                            SporeFates uses a <strong>Quadratic Scaling</strong> model. This means a highly evolved mushroom is exponentially more valuable than many weak ones.
                        </p>

                        <div className="bg-black/40 rounded-xl p-6 border border-white/10 font-mono text-sm mb-4">
                            <div className="mb-2 text-textSecondary opacity-70">// The Equation</div>
                            <div className="text-lg text-white">
                                <span className="text-blue-400">Raw_Power</span> = (Cap + BaseCap) + (Stem + BaseStem) + ...
                            </div>
                            <div className="text-xl font-bold mt-2 text-white">
                                Shares = (<span className="text-blue-400">Raw_Power</span>)² × <span className="text-purple-400">Substrate_Mult</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-textSecondary bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg w-fit">
                            <Info size={14} className="text-yellow-500" />
                            <span>This incentivizes <strong>quality over quantity</strong>.</span>
                        </div>
                    </div>

                    <div className="w-full md:w-64 bg-background rounded-xl p-4 border border-border">
                        <h4 className="text-xs font-bold uppercase text-textSecondary mb-3 tracking-wider">Example Scaling</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-textSecondary">Power 5</span>
                                <span className="font-mono font-bold text-text">25 Shares</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-textSecondary">Power 10</span>
                                <span className="font-mono font-bold text-primary">100 Shares</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-textSecondary">Power 20</span>
                                <span className="font-mono font-bold text-yellow-400">400 Shares</span>
                            </div>
                            <div className="pt-2 border-t border-white/10 text-[10px] text-textSecondary text-center">
                                4x Power = 16x Rewards
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Genetics System */}
            <section className="bg-surface/50 backdrop-blur-sm rounded-3xl p-8 border border-border mb-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                        <Dna size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-text">Genetics & Evolution</h2>
                </div>

                <p className="text-textSecondary mb-8">
                    Every mushroom has a genome of <strong>8 slots</strong>. The combination of these genes determines your permanent Base Stats.
                </p>

                {/* Gene Type Legend */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-red-500/30">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Toxin</span>
                            <span className="text-[10px] text-textSecondary">Boosts Cap</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-green-500/30">
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Chitin</span>
                            <span className="text-[10px] text-textSecondary">Boosts Stem</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-blue-500/30">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Phosphor</span>
                            <span className="text-[10px] text-textSecondary">Boosts Spores</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-yellow-500/30">
                        <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Primordial</span>
                            <span className="text-[10px] text-textSecondary">Boosts ALL</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border mb-8">
                    <table className="w-full text-left border-collapse bg-black/20">
                        <thead>
                            <tr className="bg-white/5 text-textSecondary text-xs uppercase tracking-wider">
                                <th className="py-3 px-4">Matching Genes</th>
                                <th className="py-3 px-4">Classification</th>
                                <th className="py-3 px-4 text-right">Base Stat Bonus</th>
                            </tr>
                        </thead>
                        <tbody className="text-text text-sm divide-y divide-white/5">
                            <tr>
                                <td className="py-3 px-4">1 - 2</td>
                                <td className="px-4 text-textSecondary">Recessive</td>
                                <td className="py-3 px-4 text-right text-textSecondary">+0</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4">3 - 4</td>
                                <td className="px-4 text-blue-400 font-medium">Expressed</td>
                                <td className="py-3 px-4 text-right font-bold">+1</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4">5 - 6</td>
                                <td className="px-4 text-green-400 font-medium">Dominant</td>
                                <td className="py-3 px-4 text-right font-bold">+3</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4">7</td>
                                <td className="px-4 text-orange-400 font-medium">Overlord</td>
                                <td className="py-3 px-4 text-right font-bold">+6</td>
                            </tr>
                            <tr className="bg-yellow-500/5">
                                <td className="py-3 px-4 text-yellow-500 font-bold">8</td>
                                <td className="px-4 py-3 text-yellow-500 font-bold flex items-center gap-2">
                                    <Award size={14} /> Purebred
                                </td>
                                <td className="py-3 px-4 text-right text-yellow-500 font-bold">+10</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-text">
                        <div className="p-1.5 bg-background rounded-lg border border-border">
                            <GitMerge size={18} />
                        </div>
                        <h3 className="font-bold text-lg">Splicing Mechanics</h3>
                    </div>

                    <p className="text-sm text-textSecondary mb-4">
                        Burning 2 mushrooms creates 1 child. Genes are inherited 50/50 from parents per slot.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex gap-3 text-white">
                            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <span className="font-bold text-red-400 block mb-1">Mutation Risk (5%)</span>
                                90% chance to become <span className="text-textSecondary">Rot (Null Gene)</span>, which provides no stats.
                            </div>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3 text-white">
                            <Zap size={18} className="text-yellow-400 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <span className="font-bold text-yellow-400 block mb-1">Divine Spark (0.5%)</span>
                                Rare chance for mutation to become <span className="text-yellow-200">Primordial (Gold)</span>, granting a bonus to all 3 stats.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. The Canopy (Economy) */}
            <section className="bg-surface/50 backdrop-blur-sm rounded-3xl p-8 border border-border mb-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                        <CloudRain size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-text">The Canopy</h2>
                </div>

                <p className="text-textSecondary mb-6">
                    A dynamic supply & demand system controls your yield. Rewards are multiplied based on the <strong>Global Rarity</strong> of your traits.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-emerald-400">High Demand</span>
                            <TrendingUp size={18} className="text-emerald-400" />
                        </div>
                        <p className="text-sm text-textSecondary">
                            If a trait is rare in the ecosystem, its multiplier increases (up to <strong>5.0x</strong>). Breeding for scarcity is the key to wealth.
                        </p>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 bg-red-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-red-400">Oversupply</span>
                            <TrendingUp size={18} className="text-red-400 rotate-180" />
                        </div>
                        <p className="text-sm text-textSecondary">
                            If too many players breed the same trait, rewards collapse. You must pivot your strategy to restore balance.
                        </p>
                    </div>
                </div>

                <div className="bg-black/30 rounded-xl p-4 border border-red-500/30 flex gap-4 items-start shadow-inner">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500 shrink-0">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-red-400 text-sm uppercase tracking-wide mb-1">The Shadow Zone</h3>
                        <p className="text-xs text-textSecondary leading-relaxed">
                            If your mushroom is composed mostly of oversaturated traits (Efficiency &lt; 0.8), it enters the Shadow Zone.
                            <strong> Shadow Zone mushrooms earn 0 rewards</strong> until you breed them to fix their genetics or the market shifts.
                        </p>
                    </div>
                </div>
            </section>

            {/* 5. Substrate Levels */}
            <section className="bg-surface/50 backdrop-blur-sm rounded-3xl p-8 border border-border shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                        <Award size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-text">Ascension & Prestige</h2>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 border border-border rounded-xl bg-surface/50">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-background border border-border text-text font-bold text-sm">0</div>
                        <div>
                            <h3 className="font-bold text-text text-sm">Base Layer</h3>
                            <p className="text-xs text-textSecondary">Standard rules apply. 1x Reward Multiplier.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border border-blue-500/20 bg-blue-500/5 rounded-xl">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20">1</div>
                        <div>
                            <h3 className="font-bold text-blue-400 text-sm">Regrowth Perk</h3>
                            <p className="text-xs text-textSecondary">
                                When harvesting, one random volatile stat starts at <strong>+1</strong> instead of 0.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border border-green-500/20 bg-green-500/5 rounded-xl">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-green-500 text-white font-bold text-sm shadow-lg shadow-green-500/20">2</div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-green-400 text-sm">Rooted Perk</h3>
                                <Shield size={12} className="text-green-400" />
                            </div>
                            <p className="text-xs text-textSecondary">
                                <strong>Safety Net:</strong> If you fail a spin while a stat is at +1, it stays at +1 instead of dropping.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border border-orange-500/20 bg-orange-500/5 rounded-xl">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20">3</div>
                        <div>
                            <h3 className="font-bold text-orange-400 text-sm">Hardened</h3>
                            <p className="text-xs text-textSecondary">
                                <strong>4x Rewards Multiplier</strong>. Spin success rate drops to 45% (Hard Mode).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 border border-red-500/20 bg-red-500/5 rounded-xl">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/20">4</div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-red-400 text-sm">Mycelial Network</h3>
                                <Zap size={12} className="text-red-400" />
                            </div>
                            <p className="text-xs text-textSecondary">
                                <strong>5x Rewards Multiplier</strong>. 10% chance on any spin win to crit and gain +2 stats instantly.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-16 text-center">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 hover:scale-105"
                >
                    Enter the Colony <ArrowLeft className="rotate-180" size={18} />
                </Link>
            </div>
        </div>
    );
};