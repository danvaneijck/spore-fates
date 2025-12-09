import React, { useState } from 'react';
import { MushroomRenderer } from './MushroomRenderer';
import { Sparkles, TrendingUp, Award, Loader2, Lock, AlertTriangle, PieChart } from 'lucide-react';
import { NETWORK_CONFIG } from '../config';
import { TraitExtension } from '../services/shroomService';
import { GeneticsDisplay } from './GeneticsDisplay';
import { HarvestOverlay } from './HarvestOverlay';
import { RankBadge } from './RankBadge';

interface SpinInterfaceProps {
  tokenId: string;
  traits: TraitExtension;
  onSpin: (target: 'cap' | 'stem' | 'spores') => Promise<void>;
  onHarvest: () => Promise<void>;
  onAscend: () => Promise<void>;
  rewardInfo: { accumulated: string, multiplier: string, payout: string };
  isLoading: boolean;
  globalTotalShares: number;
}

export const SpinInterface: React.FC<SpinInterfaceProps> = ({
  tokenId,
  traits,
  onSpin,
  onHarvest,
  onAscend,
  rewardInfo,
  isLoading,
  globalTotalShares
}) => {

  // Calculate Totals (Volatile + Base)
  const totalCap = Number(traits.cap) + Number(traits.base_cap || 0);
  const totalStem = Number(traits.stem) + Number(traits.base_stem || 0);
  const totalSpores = Number(traits.spores) + Number(traits.base_spores || 0);

  // Ascension Requirement: Volatile stats must be exactly +3
  const isMaxVolatile = traits.cap === 3 && traits.stem === 3 && traits.spores === 3;
  const canAscend = isMaxVolatile && traits.substrate < 4;

  const formatVal = (val: string) => (parseInt(val) / Math.pow(10, NETWORK_CONFIG.paymentDecimals)).toFixed(2);

  const payoutVal = parseFloat(formatVal(rewardInfo.payout));
  const accumulatedVal = parseFloat(formatVal(rewardInfo.accumulated));

  const isShadowZone = parseFloat(rewardInfo.multiplier) < 0.8;
  const isReduced = parseFloat(rewardInfo.multiplier) < 1.0;

  const [showHarvest, setShowHarvest] = useState(false);
  const [harvestedAmount, setHarvestedAmount] = useState('0');

  const calculateMyShares = () => {
    const rawPower = Math.max(1,
      (traits.cap + traits.base_cap) +
      (traits.stem + traits.base_stem) +
      (traits.spores + traits.base_spores)
    );
    const quadratic = Math.pow(rawPower, 2);
    const multiplier = 1 + traits.substrate;
    return quadratic * multiplier;
  };

  const myShares = calculateMyShares();

  // 2. Calculate Dominance
  const dominance = globalTotalShares > 0
    ? ((myShares / globalTotalShares) * 100).toFixed(4)
    : "100.00";

  // Calculated forfeit amount
  const forfeitAmount = (accumulatedVal - payoutVal).toFixed(2);

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

  const handleHarvestClick = async () => {
    // Capture the amount BEFORE it resets to 0
    const amountToCapture = payoutVal;

    // Call the parent function
    await onHarvest();

    // If successful (no error thrown), show animation
    if (parseFloat(amountToCapture) > 0) {
      setHarvestedAmount(amountToCapture);
      setShowHarvest(true);
    }
  };

  const getDisplayCost = () => {
    let multiplier = 1;
    switch (traits.substrate) {
      case 0: multiplier = 1; break;
      case 1: multiplier = 2; break;
      case 2: multiplier = 3; break;
      case 3: multiplier = 5; break;
      case 4: multiplier = 10; break;
    }
    return (NETWORK_CONFIG.spinCost * multiplier);
  };

  const currentCost = getDisplayCost();

  return (

    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Mushroom Visualization */}
        <div className="bg-surface rounded-3xl p-8 border border-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-text">#{tokenId}</h3>
              <p className="text-sm text-textSecondary mt-1">
                Substrate Level: <span className="text-primary font-semibold">{getSubstrateLevel()}</span>
              </p>
              {/* <div className="mt-2">
                <RankBadge shares={myShares} />
              </div> */}
            </div>
            {/* DOMINANCE CARD */}
            <div className="bg-black/20 rounded-xl p-3 border border-border/50 text-right min-w-[120px]">
              <div className="flex items-center justify-end gap-1 text-xs text-textSecondary mb-1 uppercase tracking-wider">
                <PieChart size={12} /> Dominance
              </div>
              <div className="text-xl font-mono font-bold text-primary">
                {dominance}%
              </div>

            </div>
            {/* <div className="text-right">
              <div className="text-3xl font-bold text-text">{totalPower > 0 ? '+' : ''}{totalPower}</div>
              <div className="text-xs text-textSecondary">Total Power</div>
            </div> */}
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
              baseStats={traits}
            />
          </div>

        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Spin Actions */}
          <div className="bg-surface rounded-3xl p-8 border border-border">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles size={24} className="text-primary" />
              <div>
                <h3 className="text-xl font-bold text-text">Mutate Traits</h3>
                {traits.substrate > 0 && (
                  <p className="text-xs text-textSecondary">
                    Cost Multiplier: <span className="text-primary font-bold">{currentCost / NETWORK_CONFIG.spinCost}x</span> (Substrate Lvl {traits.substrate})
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {/* CAP BUTTON - RED */}
              <button
                onClick={() => onSpin('cap')}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-500/20 to-red-500/10 border border-red-500/30 rounded-xl hover:border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="text-text font-semibold group-hover:text-red-400 transition-colors">Spin Cap</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-textSecondary">{currentCost} {NETWORK_CONFIG.paymentSymbol}</span>
                  {isLoading ? (
                    <Loader2 size={20} className="text-red-500 animate-spin" />
                  ) : (
                    <Sparkles size={20} className="text-red-500 group-hover:scale-110 transition-transform" />
                  )}
                </div>
              </button>

              {/* STEM BUTTON - GREEN */}
              <button
                onClick={() => onSpin('stem')}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-500/20 to-green-500/10 border border-green-500/30 rounded-xl hover:border-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="text-text font-semibold group-hover:text-green-400 transition-colors">Spin Stem</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-textSecondary">{currentCost} {NETWORK_CONFIG.paymentSymbol}</span>
                  {isLoading ? (
                    <Loader2 size={20} className="text-green-500 animate-spin" />
                  ) : (
                    <Sparkles size={20} className="text-green-500 group-hover:scale-110 transition-transform" />
                  )}
                </div>
              </button>

              {/* SPORES BUTTON - BLUE */}
              <button
                onClick={() => onSpin('spores')}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-500/20 to-blue-500/10 border border-blue-500/30 rounded-xl hover:border-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="text-text font-semibold group-hover:text-blue-400 transition-colors">Spin Spores</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-textSecondary">{currentCost} {NETWORK_CONFIG.paymentSymbol}</span>
                  {isLoading ? (
                    <Loader2 size={20} className="text-blue-500 animate-spin" />
                  ) : (
                    <Sparkles size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
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

            <div className={`relative border rounded-xl p-6 mb-4 transition-colors
             ${isShadowZone ? 'bg-red-500/5 border-red-500/30' : 'bg-gradient-to-r from-success/20 to-success/10 border-success/30'}`}>

              <div className="text-sm text-textSecondary mb-1">Available Payout</div>
              <div className={`text-3xl font-bold ${isShadowZone ? 'text-red-500' : 'text-success'}`}>
                {formatVal(rewardInfo.payout)} {NETWORK_CONFIG.paymentSymbol}
              </div>

              {/* THE WARNING BOX */}
              {isReduced && accumulatedVal > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-start gap-2">
                    {isShadowZone ? <Lock size={16} className="text-red-400 mt-0.5" /> : <AlertTriangle size={16} className="text-orange-400 mt-0.5" />}
                    <div>
                      <div className="text-xs font-bold text-textSecondary uppercase tracking-wide">
                        {isShadowZone ? 'Shadow Zone Lock' : 'Yield Reduction'}
                      </div>
                      <div className="text-sm text-text mt-1">
                        You have <strong>{formatVal(rewardInfo.accumulated)}</strong> pending, but the current weather ({parseFloat(rewardInfo.multiplier).toFixed(2)}x) is suppressing your yield.
                      </div>
                      <div className="text-xs text-red-400 mt-2 font-semibold">
                        Harvest now to FORFEIT {forfeitAmount} {NETWORK_CONFIG.paymentSymbol}.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleHarvestClick}
              disabled={isLoading}
              className={`w-full px-6 py-4 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${isShadowZone
                  ? 'bg-gray-600 hover:bg-red-600' // Visual warning on the button itself
                  : 'bg-gradient-to-r from-success to-success/80 hover:shadow-lg hover:shadow-success/50'
                }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Processing...</span>
              ) : isShadowZone ? (
                'Harvest (Burn 100% Rewards)' // Brutally honest button text
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
      <HarvestOverlay
        isOpen={showHarvest}
        onClose={() => setShowHarvest(false)}
        amount={harvestedAmount}
      />
    </>
  );
};