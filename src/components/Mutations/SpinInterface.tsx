import React, { useState } from 'react';
import { MushroomRenderer } from '../Mushroom/MushroomRenderer';
import { Sparkles, TrendingUp, Award, Loader2, Lock, AlertTriangle, PieChart } from 'lucide-react';
import { NETWORK_CONFIG } from '../../config';
import { TraitExtension } from '../../services/shroomService';
import { GeneticsDisplay } from '../Mushroom/GeneticsDisplay';
import { HarvestOverlay } from '../Overlays/HarvestOverlay';
import { AscensionCard } from '../Info/AscensionCard';

interface SpinInterfaceProps {
  tokenId: string;
  traits: TraitExtension;
  onSpin: (target: 'cap' | 'stem' | 'spores') => Promise<void>;
  onHarvest: () => Promise<void>;
  onAscend: () => Promise<void>;
  rewardInfo: { accumulated: string, multiplier: string, payout: string };
  isLoading: boolean;
  globalTotalShares: number;
  onReveal: () => Promise<void>;
  spinStage: 'idle' | 'requesting' | 'waiting_drand' | 'ready_to_reveal' | 'resolving';
}

export const SpinInterface: React.FC<SpinInterfaceProps> = ({
  tokenId,
  traits,
  onSpin,
  onHarvest,
  onAscend,
  rewardInfo,
  isLoading,
  globalTotalShares,
  onReveal,
  spinStage
}) => {

  // Calculate Totals (Volatile + Base)
  const totalCap = Number(traits.cap) + Number(traits.base_cap || 0);
  const totalStem = Number(traits.stem) + Number(traits.base_stem || 0);
  const totalSpores = Number(traits.spores) + Number(traits.base_spores || 0);

  // Ascension Requirement: Volatile stats must be exactly +3
  const isMaxVolatile = traits.cap === 3 && traits.stem === 3 && traits.spores === 3;
  const canAscend = isMaxVolatile && traits.substrate < 4;

  const formatVal = (val: string) => (parseInt(val) / Math.pow(10, NETWORK_CONFIG.paymentDecimals)).toFixed(3);

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
    const result = await onHarvest();

    // If successful (no error thrown), show animation
    if (result && amountToCapture > 0) {
      setHarvestedAmount(amountToCapture.toString());
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
        <div className="bg-surface rounded-3xl p-4 md:p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-text">#{tokenId}</h3>
              <p className="text-sm text-textSecondary mt-1">
                Substrate Level: <span className="text-primary font-semibold">{getSubstrateLevel()}</span>
              </p>

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
          </div>

          <div className='max-w-[300px] m-auto'>
            <MushroomRenderer traits={traits} />
          </div>

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
          <div className="bg-surface rounded-3xl p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
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

              {spinStage === 'idle' && (
                <>
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
                </>
              )}

              {/* STATE: REQUESTING (Loading 1) */}
              {spinStage === 'requesting' && (
                <div className="py-8 text-center border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 animate-pulse">
                  <Loader2 size={32} className="mx-auto text-primary animate-spin mb-2" />
                  <p className="text-primary font-bold">Initiating Mutation...</p>
                  <p className="text-xs text-textSecondary">Please sign the request transaction</p>
                </div>
              )}

              {/* STATE: WAITING (Drand) */}
              {spinStage === 'waiting_drand' && (
                <div className="py-8 text-center border-2 border-dashed border-purple-500/30 rounded-xl bg-purple-500/5">
                  <div className="relative w-12 h-12 mx-auto mb-3">
                    <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-purple-400 font-bold">Consulting the Oracle...</p>
                  <p className="text-xs text-textSecondary">Waiting for verifiable randomness (~3s)</p>
                </div>
              )}

              {/* STATE: READY (Reveal Button) */}
              {spinStage === 'ready_to_reveal' && (
                <div className="animate-fade-in-up mt-4">
                  <button
                    onClick={onReveal}
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 p-0.5 shadow-[0_0_25px_rgba(192,38,211,0.4)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(192,38,211,0.7)] hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {/* Subtle shine sweep effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                    {/* Inner Container */}
                    <div className="relative flex flex-col items-center justify-center rounded-[14px] bg-black/20 py-6 backdrop-blur-sm transition-colors group-hover:bg-transparent border border-white/10">

                      {/* Main Content */}
                      <div className="flex items-center gap-3 mb-1">
                        <div className="relative">
                          <Sparkles className="text-white animate-pulse" size={24} />
                          {/* Duplicate icon for glow blur */}
                          <div className="absolute inset-0 text-fuchsia-300 blur-sm animate-pulse opacity-50">
                            <Sparkles size={24} />
                          </div>
                        </div>
                        <span className="text-2xl font-black text-white tracking-widest drop-shadow-md">
                          REVEAL FATE
                        </span>
                      </div>

                      {/* Subtext */}
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-fuchsia-100/70 group-hover:text-white transition-colors">
                        Genetic Sequence Ready
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {/* STATE: RESOLVING (Loading 2) */}
              {spinStage === 'resolving' && (
                <div className="py-8 text-center border-2 border-dashed border-green-500/30 rounded-xl bg-green-500/5 animate-pulse">
                  <Loader2 size={32} className="mx-auto text-green-500 animate-spin mb-2" />
                  <p className="text-green-500 font-bold">Applying Mutation...</p>
                </div>
              )}

            </div>
          </div>
          {/* Rewards */}
          <div className="bg-surface rounded-3xl p-6 border border-border">
            <div className="flex items-center gap-2 mb">
              <TrendingUp size={24} className="text-success" />
              <h3 className="text-xl font-bold text-text">Rewards</h3>
            </div>
            <div className='mb-2 text-white text-sm'>Harvesting rewards resets your volatile stats.</div>

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
          <AscensionCard isLoading={isLoading} traits={traits} canAscend={canAscend} onAscend={onAscend} />

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