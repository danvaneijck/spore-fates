import React, { useState, useEffect } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { SpinInterface } from './components/SpinInterface';
import { Sprout, Github, Twitter } from 'lucide-react';

interface TraitExtension {
  cap: number;
  stem: number;
  spores: number;
  substrate: number;
}

function App() {
  const [address, setAddress] = useState('');
  const [tokenId] = useState('1'); // Demo token ID
  const [traits, setTraits] = useState<TraitExtension>({
    cap: 0,
    stem: 0,
    spores: 0,
    substrate: 0,
  });
  const [pendingRewards, setPendingRewards] = useState('0');
  const [isLoading, setIsLoading] = useState(false);

  // Demo functions - replace with actual contract calls
  const handleSpin = async (traitTarget: 'cap' | 'stem' | 'spores') => {
    setIsLoading(true);
    try {
      // Simulate spin
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Random outcome for demo
      const success = Math.random() > 0.5;
      const currentValue = traits[traitTarget];
      
      let newValue = currentValue;
      if (success) {
        newValue = currentValue === -1 ? 1 : Math.min(currentValue + 1, 3);
      } else {
        newValue = currentValue === 1 && traits.substrate >= 2 
          ? currentValue 
          : currentValue === 1 
            ? -1 
            : Math.max(currentValue - 1, -3);
      }
      
      setTraits(prev => ({
        ...prev,
        [traitTarget]: newValue,
      }));
      
      // Add to rewards
      setPendingRewards(prev => (parseFloat(prev) + 0.5).toFixed(2));
    } finally {
      setIsLoading(false);
    }
  };

  const handleHarvest = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Reset traits
      const randomTrait = ['cap', 'stem', 'spores'][Math.floor(Math.random() * 3)] as keyof TraitExtension;
      setTraits({
        cap: 0,
        stem: 0,
        spores: 0,
        substrate: traits.substrate,
        [randomTrait]: traits.substrate >= 1 ? 1 : 0,
      });
      
      setPendingRewards('0');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAscend = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = Math.random() < 0.2; // 20% chance
      
      setTraits({
        cap: 0,
        stem: 0,
        spores: 0,
        substrate: success ? Math.min(traits.substrate + 1, 4) : traits.substrate,
      });
      
      setPendingRewards('0');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
                <Sprout size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text">SporeFates</h1>
                <p className="text-xs text-textSecondary">Evolve Your Mushroom NFTs</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <Github size={20} className="text-textSecondary hover:text-text" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <Twitter size={20} className="text-textSecondary hover:text-text" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-text mb-4">
            Evolve Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Mushroom</span>
          </h2>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto mb-8">
            A strategy GameFi experience on Injective. Roll traits, harvest rewards, and ascend to prestige levels.
          </p>
          
          <div className="flex justify-center mb-8">
            <WalletConnect onAddressChange={setAddress} />
          </div>
        </div>

        {/* Game Interface */}
        {address ? (
          <SpinInterface
            tokenId={tokenId}
            traits={traits}
            onSpin={handleSpin}
            onHarvest={handleHarvest}
            onAscend={handleAscend}
            pendingRewards={pendingRewards}
            isLoading={isLoading}
          />
        ) : (
          <div className="bg-surface rounded-3xl p-12 border border-border text-center">
            <Sprout size={64} className="text-primary mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-bold text-text mb-2">Connect Your Wallet</h3>
            <p className="text-textSecondary">
              Connect your wallet to start evolving your mushroom NFTs
            </p>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-surface rounded-2xl p-6 border border-border">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Sprout size={24} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-2">Evolve Traits</h3>
            <p className="text-sm text-textSecondary">
              Spin to mutate your mushroom's cap, stem, and spores. Each trait ranges from -3 to +3.
            </p>
          </div>

          <div className="bg-surface rounded-2xl p-6 border border-border">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp size={24} className="text-success" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-2">Earn Rewards</h3>
            <p className="text-sm text-textSecondary">
              Every spin contributes to a reward pool. Harvest your share based on your mushroom's power.
            </p>
          </div>

          <div className="bg-surface rounded-2xl p-6 border border-border">
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center mb-4">
              <Award size={24} className="text-warning" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-2">Prestige System</h3>
            <p className="text-sm text-textSecondary">
              Reach +9 score to attempt ascension. Increase your substrate level for permanent bonuses.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-textSecondary">
            <p>Built on Injective Protocol • Powered by CosmWasm</p>
            <p className="mt-2">© 2025 SporeFates. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

import { TrendingUp, Award } from 'lucide-react';
