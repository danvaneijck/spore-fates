import React, { useState } from 'react';
import { MushroomRenderer } from './MushroomRenderer';
import { Dices, TrendingUp, Award, Sparkles } from 'lucide-react';

interface TraitExtension {
  cap: number;
  stem: number;
  spores: number;
  substrate: number;
}

interface SpinInterfaceProps {
  tokenId: string;
  traits: TraitExtension;
  onSpin: (traitTarget: 'cap' | 'stem' | 'spores') => Promise<void>;
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
  const [selectedTrait, setSelectedTrait] = useState<'cap' | 'stem' | 'spores'>('cap');
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSpin = async () => {
    try {
      await onSpin(selectedTrait);
      // Show confetti animation on successful spin
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error('Spin failed:', error);
    }
  };

  const canAscend = traits.cap === 3 && traits.stem === 3 && traits.spores === 3 && traits.substrate < 4;
  const totalScore = traits.cap + traits.stem + traits.spores;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            >
              <Sparkles className="text-primary" size={16 + Math.random() * 16} />
            </div>
          ))}
        </div>
      )}

      {/* Mushroom Display */}
      <div className="bg-surface rounded-3xl p-8 border border-border mb-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-text mb-2">Spore #{tokenId}</h2>
          <div className="flex items-center justify-center gap-2 text-textSecondary">
            <Award size={16} />
            <span>Total Score: {totalScore > 0 ? '+' : ''}{totalScore}</span>
          </div>
        </div>
        
        <MushroomRenderer
          cap={traits.cap}
          stem={traits.stem}
          spores={traits.spores}
          substrate={traits.substrate}
          size={300}
        />
      </div>

      {/* Trait Selection */}
      <div className="bg-surface rounded-3xl p-6 border border-border mb-6">
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Dices size={20} className="text-primary" />
          Select Trait to Evolve
        </h3>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          {(['cap', 'stem', 'spores'] as const).map((trait) => (
            <button
              key={trait}
              onClick={() => setSelectedTrait(trait)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedTrait === trait
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-sm text-textSecondary capitalize mb-1">{trait}</div>
              <div className={`text-2xl font-bold ${
                traits[trait] >= 0 ? 'text-success' : 'text-error'
              }`}>
                {traits[trait] > 0 ? '+' : ''}{traits[trait]}
              </div>
              <div className="text-xs text-textSecondary mt-1">
                {traits[trait] === 3 ? 'MAX' : traits[trait] === -3 ? 'MIN' : 'Active'}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSpin}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Dices size={24} />
          {isLoading ? 'Spinning...' : 'Spin (1 SHROOM)'}
        </button>

        <div className="mt-4 p-4 bg-background rounded-xl">
          <div className="text-xs text-textSecondary mb-2">Success Rate</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${traits.substrate >= 3 ? 55 : 50}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-text">
              {traits.substrate >= 3 ? '55%' : '50%'}
            </span>
          </div>
          {traits.substrate >= 2 && (
            <div className="mt-2 text-xs text-success flex items-center gap-1">
              <Sparkles size={12} />
              Safety Net Active: +1 protected from becoming -1
            </div>
          )}
          {traits.substrate >= 4 && (
            <div className="mt-1 text-xs text-warning flex items-center gap-1">
              <Sparkles size={12} />
              Double Boost: 10% chance for +2 on success
            </div>
          )}
        </div>
      </div>

      {/* Rewards & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Harvest */}
        <div className="bg-surface rounded-3xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-success" />
            Harvest Rewards
          </h3>
          
          <div className="mb-4">
            <div className="text-sm text-textSecondary mb-1">Pending Rewards</div>
            <div className="text-3xl font-bold text-success">
              {pendingRewards} SHROOM
            </div>
          </div>

          <button
            onClick={onHarvest}
            disabled={isLoading || pendingRewards === '0'}
            className="w-full bg-success hover:bg-success/90 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Harvesting...' : 'Harvest & Reset'}
          </button>

          <div className="mt-3 text-xs text-textSecondary">
            Resets Cap, Stem, and Spores to 0. Substrate level 1+ gives +1 to random trait.
          </div>
        </div>

        {/* Ascend */}
        <div className="bg-surface rounded-3xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Award size={20} className="text-warning" />
            Ascend (Prestige)
          </h3>
          
          <div className="mb-4">
            <div className="text-sm text-textSecondary mb-1">Current Prestige</div>
            <div className="text-3xl font-bold text-warning">
              Level {traits.substrate}
            </div>
          </div>

          <button
            onClick={onAscend}
            disabled={isLoading || !canAscend}
            className="w-full bg-warning hover:bg-warning/90 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Ascending...' : 'Ascend (20% chance)'}
          </button>

          <div className="mt-3 text-xs text-textSecondary">
            {!canAscend && totalScore < 9 && 'Requires all traits at +3'}
            {!canAscend && traits.substrate >= 4 && 'Max prestige reached'}
            {canAscend && 'Burns rewards for 20% chance to increase prestige'}
          </div>
        </div>
      </div>
    </div>
  );
};
