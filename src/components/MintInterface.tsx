import React from 'react';
import { Sparkles, Loader2, Coins } from 'lucide-react';
import { NETWORK_CONFIG } from '../config';

interface MintInterfaceProps {
  onMint: () => Promise<void>;
  isLoading: boolean;
}

export const MintInterface: React.FC<MintInterfaceProps> = ({
  onMint,
  isLoading,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-surface rounded-3xl p-4 md:p-12 border border-border shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl mb-6 shadow-lg shadow-primary/30">
            <Sparkles size={40} className="text-white" />
          </div>
          <h2 className="text-4xl font-bold text-text mb-3">
            Mint Your Mushroom
          </h2>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto">
            Begin your journey in Spore Fates. Each mushroom starts with random traits that you can evolve through gameplay.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-background rounded-xl p-6 border border-border/50">
            <div className="text-3xl mb-2">🍄</div>
            <h3 className="text-sm font-semibold text-text mb-1">Unique NFT</h3>
            <p className="text-xs text-textSecondary">
              Each mushroom is a one-of-a-kind digital collectible
            </p>
          </div>

          <div className="bg-background rounded-xl p-6 border border-border/50">
            <div className="text-3xl mb-2">🎲</div>
            <h3 className="text-sm font-semibold text-text mb-1">Random Traits</h3>
            <p className="text-xs text-textSecondary">
              Start with randomized cap, stem, and spore values
            </p>
          </div>

          <div className="bg-background rounded-xl p-6 border border-border/50">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="text-sm font-semibold text-text mb-1">Evolve & Earn</h3>
            <p className="text-xs text-textSecondary">
              Mutate traits and earn rewards through gameplay
            </p>
          </div>
        </div>

        {/* Mint Button */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-20 blur-2xl rounded-2xl" />

          <button
            onClick={onMint}
            disabled={isLoading}
            className="relative w-full group"
          >
            {/* Button background with gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent rounded-2xl opacity-100 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-[2px] bg-gradient-to-br from-surface to-background rounded-2xl" />

            {/* Button content */}
            <div className="relative px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isLoading ? (
                  <Loader2 size={32} className="text-primary animate-spin" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                    <Sparkles size={24} className="text-white" />
                  </div>
                )}

                <div className="text-left">
                  <div className="text-2xl font-bold text-text group-hover:text-primary transition-colors">
                    {isLoading ? 'Minting...' : 'Mint Mushroom'}
                  </div>
                  <div className="text-sm text-textSecondary">
                    {isLoading ? 'Processing transaction...' : 'Start your Spore Fates journey'}
                  </div>
                </div>
              </div>

              {/* Price badge */}
              <div className="flex items-center gap-3 bg-gradient-to-br from-primary/20 to-secondary/20 px-6 py-3 rounded-xl border border-primary/30 group-hover:border-primary/50 transition-colors">
                <Coins size={24} className="text-primary" />
                <div className="text-right">
                  <div className="text-xs text-textSecondary uppercase tracking-wide">
                    Price
                  </div>
                  <div className="text-xl font-bold text-text">
                    {NETWORK_CONFIG.mintCost} <span className="text-primary">{NETWORK_CONFIG.paymentSymbol}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        </div>

        {/* Additional info */}
        <div className="mt-6 text-center text-sm text-textSecondary">
          <p>
            💡 Tip: After minting, you can mutate your mushroom's traits using the spin wheel to improve its score and earn rewards.
          </p>
        </div>
      </div>
    </div>
  );
};
