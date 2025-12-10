import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Coins, TrendingUp } from 'lucide-react';
import { NETWORK_CONFIG } from '../config';
import { MushroomGrowth } from './MushroomGrowth'; // Import the new component
import { shroomService } from '../services/shroomService';

interface MintInterfaceProps {
  onMint: (price: string) => Promise<void>;
  isLoading: boolean;
}

export const MintInterface: React.FC<MintInterfaceProps> = ({
  onMint,
  isLoading,
}) => {
  const [currentPrice, setCurrentPrice] = useState<string>('0');
  const [displayPrice, setDisplayPrice] = useState<string>('0');

  // Fetch Bonding Curve Price
  const fetchPrice = async () => {
    const price = await shroomService.getCurrentMintPrice();

    const priceRaw = Number(price)
    setCurrentPrice((priceRaw).toString());
    const readable = (Number(priceRaw) / Math.pow(10, NETWORK_CONFIG.paymentDecimals)).toFixed(2);
    setDisplayPrice(readable);
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className={`bg-surface rounded-3xl p-4 md:p-12 border transition-all duration-500 shadow-xl
         ${isLoading ? 'border-primary shadow-primary/20 scale-[1.02]' : 'border-border'}`}>

        {/* Header with Animation Switch */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center rounded-2xl mb-6 shadow-lg transition-all duration-500
             ${isLoading
              ? 'w-32 h-32 bg-surface border border-primary/30'
              : 'w-20 h-20 bg-gradient-to-br from-primary to-primary/60 shadow-primary/30'}`}>

            {/* Conditional Rendering: Static Icon vs Growth Animation */}
            {isLoading ? (
              <MushroomGrowth />
            ) : (
              <Sparkles size={40} className="text-white" />
            )}

          </div>

          <h2 className="text-4xl font-bold text-text mb-3">
            {isLoading ? 'Birthing Sporeling...' : 'Mint Your Mushroom'}
          </h2>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto">
            {isLoading
              ? 'Genetic sequences are fusing. Constructing base stats...'
              : 'Begin your journey in Spore Fates. Each mushroom starts with random traits that you can evolve.'}
          </p>
        </div>

        {/* Features Grid (Hidden while growing to focus attention) */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-background rounded-xl p-6 border border-border/50">
              <div className="text-3xl mb-2">🍄</div>
              <h3 className="text-sm font-semibold text-text mb-1">Unique NFT</h3>
              <p className="text-xs text-textSecondary">
                One-of-a-kind digital collectible
              </p>
            </div>
            <div className="bg-background rounded-xl p-6 border border-border/50">
              <div className="text-3xl mb-2">🧬</div>
              <h3 className="text-sm font-semibold text-text mb-1">8-Gene Genome</h3>
              <p className="text-xs text-textSecondary">
                Randomized genetics determine Base Stats
              </p>
            </div>
            <div className="bg-background rounded-xl p-6 border border-border/50">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="text-sm font-semibold text-text mb-1">Evolve & Earn</h3>
              <p className="text-xs text-textSecondary">
                Mutate traits to gain reward shares
              </p>
            </div>
          </div>
        )}

        {/* Mint Button Area */}
        <div className="relative">
          {/* Price Indicator */}
          {!isLoading && (
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 bg-background px-4 py-2 rounded-lg border border-border">
                <TrendingUp size={16} className="text-primary" />
                <span className="text-sm text-textSecondary">Current Price:</span>
                <span className="font-bold text-text">{displayPrice} {NETWORK_CONFIG.paymentSymbol}</span>
              </div>
            </div>
          )}

          <div className="relative">
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-20 blur-2xl rounded-2xl transition-opacity
                ${isLoading ? 'opacity-40 animate-pulse' : 'opacity-20'}`} />

            <button
              onClick={() => onMint(currentPrice)}
              disabled={isLoading}
              className="relative w-full group overflow-hidden rounded-2xl"
            >
              {/* Button Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-100 group-hover:opacity-90 transition-opacity" />
              <div className="absolute inset-[2px] bg-gradient-to-br from-surface to-background rounded-2xl" />

              {/* Progress Bar (Visible only when loading) */}
              {isLoading && (
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-accent transition-all duration-[3000ms] ease-out w-full animate-[width_3s_ease-out]" />
              )}

              {/* Button content */}
              <div className="relative px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {isLoading ? (
                    <div className="w-12 h-12 flex items-center justify-center">
                      <Loader2 size={32} className="text-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                      <Sparkles size={24} className="text-white" />
                    </div>
                  )}

                  <div className="text-left">
                    <div className="text-2xl font-bold text-text group-hover:text-primary transition-colors">
                      {isLoading ? 'Cultivating...' : 'Mint Mushroom'}
                    </div>
                    <div className="text-sm text-textSecondary">
                      {isLoading ? 'Please wait for confirmation' : 'Start your Spore Fates journey'}
                    </div>
                  </div>
                </div>

                {/* Price badge (fades out on load) */}
                <div className={`flex items-center gap-3 bg-gradient-to-br from-primary/20 to-secondary/20 px-6 py-3 rounded-xl border border-primary/30 transition-opacity duration-300
                    ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                  <Coins size={24} className="text-primary" />
                  <div className="text-right">
                    <div className="text-xs text-textSecondary uppercase tracking-wide">
                      Price
                    </div>
                    <div className="text-xl font-bold text-text">
                      {displayPrice}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};