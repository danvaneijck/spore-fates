import React from 'react';
import { MushroomRenderer } from './MushroomRenderer';
import { Sparkles, TrendingUp, Award, Loader2 } from 'lucide-react';
import { NETWORK_CONFIG } from '../config';
import { TraitExtension } from '../services/shroomService';
import { GeneticsDisplay } from './GeneticsDisplay';

interface SpinInterfaceProps {
  tokenId: string;
  traits: TraitExtension;
  onSpin: (target: 'cap' | 'stem' | 'spores') => Promise<void>;
  onHarvest: () => Promise<void>;
  onAscend: () => Promise<void>;
  pendingRewards: string;
  isLoading: boolean;
}

export const SpinInterface: React.FC<SpinInterfaceProps> = ({
  tokenId,
  traits,
  onSpin,
  onHarvest,
  onAscend,
  pendingRewards,
  isLoading,
}) => {

  // Calculate Totals (Volatile + Base)
  const totalCap = Number(traits.cap) + Number(traits.base_cap || 0);
  const totalStem = Number(traits.stem) + Number(traits.base_stem || 0);
  const totalSpores = Number(traits.spores) + Number(traits.base_spores || 0);

  // Total Power determines yield weight
  const totalPower = totalCap + totalStem + totalSpores;

  // Ascension Requirement: Volatile stats must be exactly +3
  const isMaxVolatile = traits.cap === 3 && traits.stem === 3 && traits.spores === 3;
  const canAscend = isMaxVolatile && traits.substrate < 4;

  const hasRewards = parseFloat(pendingRewards) > 0;

  const getTraitColor = (value: number) => {
    if (value >= 5) return 'text-yellow-400'; // High base stats
    if (value >= 2) return 'text-success';
    if (value >= 0) return 'text-text';
    return 'text-error';
  };

  const getSubstrateLevel = () => {
    const levels = ['None', 'Novice', 'Adept', 'Expert', 'Master', 'Legend'];
    return levels[traits.substrate] || 'Unknown';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Mushroom Visualization */}
      <div className="bg-surface rounded-3xl p-8 border border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-text">Mushroom #{tokenId}</h3>
            <p className="text-sm text-textSecondary mt-1">
              Substrate Level: <span className="text-primary font-semibold">{getSubstrateLevel()}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-text">{totalPower > 0 ? '+' : ''}{totalPower}</div>
            <div className="text-xs text-textSecondary">Total Power</div>
          </div>
        </div>

        <MushroomRenderer traits={traits} />

        {/* Trait Stats Breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {/* CAP */}
          <div className="bg-background rounded-xl p-3 text-center border border-border/50">
            <div className="text-xs text-textSecondary mb-1 uppercase tracking-wider">Cap</div>
            <div className={`text-2xl font-bold ${getTraitColor(totalCap)}`}>
              {totalCap > 0 ? '+' : ''}{totalCap}
            </div>
            <div className="text-[10px] text-textSecondary mt-1 flex justify-center gap-1">
              <span>{traits.cap > 0 ? '+' : ''}{traits.cap} V</span>
              <span className="text-border">|</span>
              <span className="text-primary">{traits.base_cap > 0 ? '+' : ''}{traits.base_cap} B</span>
            </div>
          </div>

          {/* STEM */}
          <div className="bg-background rounded-xl p-3 text-center border border-border/50">
            <div className="text-xs text-textSecondary mb-1 uppercase tracking-wider">Stem</div>
            <div className={`text-2xl font-bold ${getTraitColor(totalStem)}`}>
              {totalStem > 0 ? '+' : ''}{totalStem}
            </div>
            <div className="text-[10px] text-textSecondary mt-1 flex justify-center gap-1">
              <span>{traits.stem > 0 ? '+' : ''}{traits.stem} V</span>
              <span className="text-border">|</span>
              <span className="text-primary">{traits.base_stem > 0 ? '+' : ''}{traits.base_stem} B</span>
            </div>
          </div>

          {/* SPORES */}
          <div className="bg-background rounded-xl p-3 text-center border border-border/50">
            <div className="text-xs text-textSecondary mb-1 uppercase tracking-wider">Spores</div>
            <div className={`text-2xl font-bold ${getTraitColor(totalSpores)}`}>
              {totalSpores > 0 ? '+' : ''}{totalSpores}
            </div>
            <div className="text-[10px] text-textSecondary mt-1 flex justify-center gap-1">
              <span>{traits.spores > 0 ? '+' : ''}{traits.spores} V</span>
              <span className="text-border">|</span>
              <span className="text-primary">{traits.base_spores > 0 ? '+' : ''}{traits.base_spores} B</span>
            </div>
          </div>
        </div>

        <div className='mt-5'>
          <GeneticsDisplay
            genome={traits.genome}
            baseStats={{ cap: traits.base_cap, stem: traits.base_stem, spores: traits.base_spores }}
          />
        </div>

      </div>

      {/* Right Column - Actions */}
      <div className="space-y-6">
        {/* Spin Actions */}
        <div className="bg-surface rounded-3xl p-8 border border-border">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={24} className="text-primary" />
            <h3 className="text-xl font-bold text-text">Mutate Traits</h3>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onSpin('cap')}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="text-text font-semibold">Spin Cap</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-textSecondary">{NETWORK_CONFIG.spinCost} {NETWORK_CONFIG.paymentSymbol}</span>
                {isLoading ? (
                  <Loader2 size={20} className="text-primary animate-spin" />
                ) : (
                  <Sparkles size={20} className="text-primary group-hover:scale-110 transition-transform" />
                )}
              </div>
            </button>

            <button
              onClick={() => onSpin('stem')}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-secondary/20 to-secondary/10 border border-secondary/30 rounded-xl hover:border-secondary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="text-text font-semibold">Spin Stem</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-textSecondary">{NETWORK_CONFIG.spinCost} {NETWORK_CONFIG.paymentSymbol}</span>
                {isLoading ? (
                  <Loader2 size={20} className="text-secondary animate-spin" />
                ) : (
                  <Sparkles size={20} className="text-secondary group-hover:scale-110 transition-transform" />
                )}
              </div>
            </button>

            <button
              onClick={() => onSpin('spores')}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 rounded-xl hover:border-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="text-text font-semibold">Spin Spores</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-textSecondary">{NETWORK_CONFIG.spinCost} {NETWORK_CONFIG.paymentSymbol}</span>
                {isLoading ? (
                  <Loader2 size={20} className="text-accent animate-spin" />
                ) : (
                  <Sparkles size={20} className="text-accent group-hover:scale-110 transition-transform" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-surface rounded-3xl p-8 border border-border">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={24} className="text-success" />
            <h3 className="text-xl font-bold text-text">Rewards</h3>
          </div>

          <div className="bg-gradient-to-r from-success/20 to-success/10 border border-success/30 rounded-xl p-6 mb-4">
            <div className="text-sm text-textSecondary mb-1">Pending Rewards</div>
            <div className="text-3xl font-bold text-success">{pendingRewards} {NETWORK_CONFIG.paymentSymbol}</div>
          </div>

          <button
            onClick={onHarvest}
            disabled={isLoading || !hasRewards}
            className="w-full px-6 py-4 bg-gradient-to-r from-success to-success/80 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-success/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </span>
            ) : (
              'Harvest Rewards'
            )}
          </button>
        </div>

        {/* Ascension */}
        <div className="bg-surface rounded-3xl p-8 border border-border">
          <div className="flex items-center gap-2 mb-6">
            <Award size={24} className="text-warning" />
            <h3 className="text-xl font-bold text-text">Ascension</h3>
          </div>

          <div className="bg-gradient-to-r from-warning/20 to-warning/10 border border-warning/30 rounded-xl p-6 mb-4">
            <div className="text-sm text-textSecondary mb-2">
              {canAscend
                ? '✨ Ready to ascend! 20% chance to increase substrate level.'
                : traits.substrate === 4
                  ? '🏆 Maximum substrate level reached!'
                  : `📈 Reach +3 in all Volatile traits to unlock ascension.`
              }
            </div>

            {/* Progress Indicators for Ascension */}
            {traits.substrate < 4 && !canAscend && (
              <div className="flex gap-2 mt-2 justify-center">
                <span className={`text-xs px-2 py-0.5 rounded ${traits.cap === 3 ? 'bg-green-500/20 text-green-400' : 'bg-background text-textSecondary'}`}>
                  Cap {traits.cap}/3
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${traits.stem === 3 ? 'bg-green-500/20 text-green-400' : 'bg-background text-textSecondary'}`}>
                  Stem {traits.stem}/3
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${traits.spores === 3 ? 'bg-green-500/20 text-green-400' : 'bg-background text-textSecondary'}`}>
                  Spores {traits.spores}/3
                </span>
              </div>
            )}

            {canAscend && (
              <div className="text-xs text-warning mt-2 font-semibold">
                ⚠️ Burns all pending rewards. Resets volatile traits to 0.
              </div>
            )}
          </div>

          <button
            onClick={onAscend}
            disabled={isLoading || !canAscend}
            className="w-full px-6 py-4 bg-gradient-to-r from-warning to-warning/80 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-warning/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </span>
            ) : (
              'Attempt Ascension'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};