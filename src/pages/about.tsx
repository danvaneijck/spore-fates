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
    Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SporeLogo } from '../components/Logo/SporeLogo';

export const About: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-20">

            {/* Header */}
            <div className="mb-8">
                <Link to="/" className="inline-flex items-center text-textSecondary hover:text-primary transition-colors mb-6">
                    <ArrowLeft size={20} className="mr-2" /> Back to Colony
                </Link>
                <div className='flex gap-2 items-center'>
                    <SporeLogo size={60} />
                    <h1 className="text-4xl font-bold text-text mb-4">Game Rules & Mechanics</h1>
                </div>

                <p className="text-xl text-textSecondary">
                    Master the art of genetic engineering and ecosystem balance to maximize your yield.
                </p>
            </div>

            {/* 1. Core Concept */}
            <section className="bg-surface rounded-3xl p-8 border border-border mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Sprout className="text-primary" size={28} />
                    <h2 className="text-2xl font-bold text-text">The Basics</h2>
                </div>
                <p className="text-textSecondary leading-relaxed mb-6">
                    SporeFates is a strategy game where you evolve Mushroom NFTs. Your goal is to increase your
                    <strong> Total Power</strong> (Volatile Stats + Base Stats) to earn a larger share of the global reward pool.
                    However, you must also navigate the <strong>Global Ecosystem</strong>—if too many players breed the same trait,
                    rewards for that trait will collapse.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background rounded-xl p-4 border border-border/50">
                        <h3 className="font-bold text-text mb-1">Volatile Stats (-3 to +3)</h3>
                        <p className="text-sm text-textSecondary">
                            Changed by <strong>Spinning</strong>. High risk. Resets to 0 on Harvest (unless you have perks).
                            Required to trigger Ascension.
                        </p>
                    </div>
                    <div className="bg-background rounded-xl p-4 border border-border/50">
                        <h3 className="font-bold text-text mb-1">Base Stats (0 to +10)</h3>
                        <p className="text-sm text-textSecondary">
                            Determined by <strong>Genetics</strong>. Permanent. Never resets.
                            Provides a safe floor for your power and determines your resilience in the market.
                        </p>
                    </div>
                </div>
            </section>

            {/* 2. Genetics System */}
            <section className="bg-surface rounded-3xl p-8 border border-border mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Dna className="text-purple-400" size={28} />
                    <h2 className="text-2xl font-bold text-text">Genetics & Splicing</h2>
                </div>

                <p className="text-textSecondary mb-6">
                    Every mushroom has a genome of <strong>8 slots</strong>. The number of matching genes determines your Base Stats.
                </p>

                <div className="overflow-x-auto mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border text-textSecondary text-sm">
                                <th className="py-2">Gene Count</th>
                                <th className="py-2">Classification</th>
                                <th className="py-2 text-right">Base Stat Bonus</th>
                            </tr>
                        </thead>
                        <tbody className="text-text">
                            <tr className="border-b border-border/30">
                                <td className="py-3">1 - 2</td>
                                <td className="text-textSecondary">Recessive</td>
                                <td className="text-right text-textSecondary">+0</td>
                            </tr>
                            <tr className="border-b border-border/30">
                                <td className="py-3">3 - 4</td>
                                <td className="text-blue-400">Expressed</td>
                                <td className="text-right font-bold">+1</td>
                            </tr>
                            <tr className="border-b border-border/30">
                                <td className="py-3">5 - 6</td>
                                <td className="text-green-400">Dominant</td>
                                <td className="text-right font-bold">+3</td>
                            </tr>
                            <tr className="border-b border-border/30">
                                <td className="py-3">7</td>
                                <td className="text-orange-400">Overlord</td>
                                <td className="text-right font-bold">+6</td>
                            </tr>
                            <tr>
                                <td className="py-3">8</td>
                                <td className="text-yellow-400 font-bold">Purebred</td>
                                <td className="text-right text-yellow-400 font-bold">+10</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-background rounded-xl p-6 border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                        <GitMerge size={20} className="text-text" />
                        <h3 className="font-bold text-text">Splicing (Breeding)</h3>
                    </div>
                    <p className="text-sm text-textSecondary mb-4">
                        Burn 2 Parent Mushrooms to create 1 Child. The child inherits genes from parents with a 50/50 chance per slot.
                    </p>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-red-400">•</span>
                            <span className="text-textSecondary"><strong>Risk:</strong> 5% mutation chance per slot. 90% of mutations result in <strong>Rot (Null Gene)</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-400">•</span>
                            <span className="text-textSecondary"><strong>Reward:</strong> 10% of mutations result in <strong>Primordial (Gold)</strong> genes, which count as All Stats.</span>
                        </li>
                    </ul>
                </div>
            </section>

            {/* 3. The Canopy (Economy) */}
            <section className="bg-surface rounded-3xl p-8 border border-border mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <CloudRain className="text-blue-400" size={28} />
                    <h2 className="text-2xl font-bold text-text">The Canopy: Dynamic Weather</h2>
                </div>

                <p className="text-textSecondary mb-6">
                    Rewards are not just about raw stats. They are multiplied by the <strong>Scarcity</strong> of your traits in the global ecosystem.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-green-400">High Demand (Rare)</span>
                            <TrendingUp size={16} className="text-green-400" />
                        </div>
                        <p className="text-sm text-textSecondary">
                            If a trait (e.g., Spores) is rare, its multiplier increases (e.g., 2.5x). Breeding for rare traits yields massive rewards.
                        </p>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-red-400">Oversaturated (Common)</span>
                            <TrendingUp size={16} className="text-red-400 rotate-180" />
                        </div>
                        <p className="text-sm text-textSecondary">
                            If everyone breeds the same trait, its value drops. Rewards can shrink to 0.5x or less.
                        </p>
                    </div>
                </div>

                <div className="bg-background rounded-xl p-4 border border-red-500/50 flex gap-4 items-start">
                    <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
                    <div>
                        <h3 className="font-bold text-red-500">The Shadow Zone</h3>
                        <p className="text-sm text-textSecondary mt-1">
                            If your mushroom's specific mix of genes is too common, its efficiency score may drop below <strong>0.8</strong>.
                            <strong> Mushrooms in the Shadow Zone earn 0 rewards.</strong> You must Splice them or mint new types to restore ecosystem balance.
                        </p>
                    </div>
                </div>
            </section>

            {/* 4. Substrate Levels */}
            <section className="bg-surface rounded-3xl p-8 border border-border">
                <div className="flex items-center gap-3 mb-6">
                    <Award className="text-yellow-400" size={28} />
                    <h2 className="text-2xl font-bold text-text">Substrate Levels (Prestige)</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4 p-4 border border-border rounded-xl">
                        <div className="h-10 w-10 bg-surface rounded-full flex items-center justify-center shrink-0 border border-border text-text font-bold">0</div>
                        <div>
                            <h3 className="font-bold text-text">Base Level</h3>
                            <p className="text-sm text-textSecondary">Standard rules apply. 1x Reward Multiplier.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 border border-blue-500/30 bg-blue-500/5 rounded-xl">
                        <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold">1</div>
                        <div>
                            <h3 className="font-bold text-blue-400">Regrowth</h3>
                            <p className="text-sm text-textSecondary">
                                <strong>Harvest Perk:</strong> When harvesting, one random volatile stat starts at +1 instead of 0.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 border border-green-500/30 bg-green-500/5 rounded-xl">
                        <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold">2</div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-green-400">Rooted</h3>
                                <Shield size={14} className="text-green-400" />
                            </div>
                            <p className="text-sm text-textSecondary">
                                <strong>Spin Perk:</strong> Protection at +1. If you fail a spin while a stat is +1, it stays at +1.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 border border-orange-500/30 bg-orange-500/5 rounded-xl">
                        <div className="h-10 w-10 bg-orange-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold">3</div>
                        <div>
                            <h3 className="font-bold text-orange-400">Hardened</h3>
                            <p className="text-sm text-textSecondary">
                                <strong>Multiplier:</strong> 4x Rewards. <br />
                                <strong>Trade-off:</strong> Spin success rate drops from 50% to 45%.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 border border-red-500/30 bg-red-500/5 rounded-xl">
                        <div className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold">4</div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-red-400">Mycelial Network</h3>
                                <Zap size={14} className="text-red-400" />
                            </div>
                            <p className="text-sm text-textSecondary">
                                <strong>Crit Perk:</strong> 5x Rewards. 10% chance on spin win to gain +2 stats instantly.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-12 text-center">
                <Link
                    to="/"
                    className="inline-block px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary/20"
                >
                    Enter the Colony
                </Link>
            </div>
        </div>
    );
};