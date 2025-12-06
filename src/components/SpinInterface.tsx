import React from 'react';
import { MushroomRenderer } from './MushroomRenderer';
import { Sparkles, TrendingUp, Award, Loader2 } from 'lucide-react';

interface TraitExtension {
  cap: number;
  stem: number;
  spores: number;
  substrate: number;
}

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
  const score = traits.cap + traits.stem + traits.spores;
  const canAscend = score === 9 && traits.substrate < 4;
  const hasRewards = parseFloat(pendingRewards) > 0;

  const getTraitColor = (value: number) => {
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
            <div className="text-3xl font-bold text-text">{score > 0 ? '+' : ''}{score}</div>
            <div className="text-xs text-textSecondary">Total Score</div>
          </div>
        </div>

        <MushroomRenderer traits={traits} />

        {/* Trait Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-xs text-textSecondary mb-1">Cap</div>
            <div className={`text-2xl font-bold ${getTraitColor(traits.cap)}`}>
              {traits.cap > 0 ? '+' : ''}{traits.cap}
            </div>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-xs text-textSecondary mb-1">Stem</div>
            <div className={`text-2xl font-bold ${getTraitColor(traits.stem)}`}>
              {traits.stem > 0 ? '+' : ''}{traits.stem}
            </div>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-xs text-textSecondary mb-1">Spores</div>
            <div className={`text-2xl font-bold ${getTraitColor(traits.spores)}`}>
              {traits.spores > 0 ? '+' : ''}{traits.spores}
            </div>
          </div>
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
                <span className="text-sm text-textSecondary">0.5 SHROOM</span>
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
                <span className="text-sm text-textSecondary">0.5 SHROOM</span>
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
                <span className="text-sm text-textSecondary">0.5 SHROOM</span>
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
            <div className="text-3xl font-bold text-success">{pendingRewards} SHROOM</div>
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
                : score === 9 
                  ? '🏆 Maximum substrate level reached!'
                  : `📈 Reach +9 score to unlock ascension (Current: ${score > 0 ? '+' : ''}${score})`
              }
            </div>
            {canAscend && (
              <div className="text-xs text-warning mt-2">
                ⚠️ Burns all pending rewards. Resets traits to 0.
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
