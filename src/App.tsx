import React, { useState, useEffect } from 'react';
import { WalletConnect, walletStrategy } from './components/WalletConnect';
import { SpinInterface } from './components/SpinInterface';
import { SpinWheel } from './components/SpinWheel';
import { ToastProvider } from './components/ToastProvider';
import { Sprout, Github, Twitter, PlusCircle } from 'lucide-react';
import { MsgBroadcaster } from "@injectivelabs/wallet-core";
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { MushroomGallery } from './components/MushroomGallery';
import { shroomService } from './services/shroomService';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { NETWORK_CONFIG } from './config';
import { parseSpinResult, SpinResult } from './utils/transactionParser';
import { showTransactionToast } from './utils/toast';

interface TraitExtension {
  cap: number;
  stem: number;
  spores: number;
  substrate: number;
}

const GameContainer = ({ address, refreshTrigger, setRefreshTrigger, executeTransaction, isLoading }) => {
  const { tokenId } = useParams();

  const [traits, setTraits] = useState<TraitExtension>({ cap: 0, stem: 0, spores: 0, substrate: 0 });
  const [pendingRewards, setPendingRewards] = useState('0');
  const [displayRewards, setDisplayRewards] = useState('0.00');

  // Spin wheel state
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [showWheel, setShowWheel] = useState(false);
  const [pendingTraitUpdate, setPendingTraitUpdate] = useState<TraitExtension | null>(null);

  useEffect(() => {
    if (!address || !tokenId) {
      setTraits({ cap: 0, stem: 0, spores: 0, substrate: 0 });
      return;
    }

    const fetchData = async () => {
      const traitData = await shroomService.getShroomTraits(tokenId);
      if (traitData) {
        // Only update traits if we don't have a pending update (wheel is not showing)
        if (!showWheel) {
          setTraits(traitData);
        } else {
          // Store the new traits to apply after wheel is dismissed
          setPendingTraitUpdate(traitData);
        }
      }

      const rewards = await shroomService.getPendingRewards(tokenId);
      setPendingRewards(rewards);

      const displayVal = (parseInt(rewards) / Math.pow(10, NETWORK_CONFIG.paymentDecimals));
      setDisplayRewards(displayVal.toFixed(2));
    };

    fetchData();
  }, [address, tokenId, refreshTrigger, showWheel]);

  const onSpin = async (target) => {
    if (!tokenId) return;
    const msg = shroomService.makeSpinMsg(address, tokenId, target);
    const result = await executeTransaction(msg, 'spin');
    
    if (result) {
      const parsed = parseSpinResult(result);
      if (parsed) {
        setSpinResult(parsed);
        setShowWheel(true);
      }
    }
  };

  const onHarvest = async () => {
    if (!tokenId) return;
    const msg = shroomService.makeHarvestMsg(address, tokenId);
    await executeTransaction(msg, 'harvest');
    setPendingRewards('0');
    setDisplayRewards('0.00');
  };

  const onAscend = async () => {
    if (!tokenId) return;
    const msg = shroomService.makeAscendMsg(address, tokenId);
    await executeTransaction(msg, 'ascend');
  };

  const handleWheelComplete = () => {
    setShowWheel(false);
    setSpinResult(null);
    
    // Apply pending trait update if we have one
    if (pendingTraitUpdate) {
      setTraits(pendingTraitUpdate);
      setPendingTraitUpdate(null);
    }
    
    // Trigger a refresh to ensure we have the latest data
    setRefreshTrigger(prev => prev + 1);
  };

  if (!tokenId) {
    return (
      <div className="bg-surface rounded-3xl p-12 border border-border text-center flex-1">
        <Sprout size={64} className="text-primary mx-auto mb-4 opacity-50" />
        <h3 className="text-2xl font-bold text-text mb-2">Select a Mushroom</h3>
        <p className="text-textSecondary">
          Choose a mushroom from your colony on the left, or mint a new one!
        </p>
      </div>
    );
  }

  return (
    <>
      <SpinInterface
        tokenId={tokenId}
        traits={traits}
        onSpin={onSpin}
        onHarvest={onHarvest}
        onAscend={onAscend}
        pendingRewards={displayRewards}
        isLoading={isLoading}
      />
      
      {spinResult && (
        <SpinWheel
          isSpinning={showWheel}
          oldValue={spinResult.oldValue}
          newValue={spinResult.newValue}
          traitTarget={spinResult.traitTarget}
          onComplete={handleWheelComplete}
        />
      )}
    </>
  );
};

function App() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const executeTransaction = async (msg: any, actionType: string = 'transaction') => {
    setIsLoading(true);
    const toastId = showTransactionToast.loading(
      actionType === 'spin' ? 'Spinning the wheel...' :
      actionType === 'harvest' ? 'Harvesting rewards...' :
      actionType === 'ascend' ? 'Attempting ascension...' :
      actionType === 'mint' ? 'Minting mushroom...' :
      'Processing transaction...'
    );

    try {
      const network = NETWORK_CONFIG.network === "mainnet" ? Network.Mainnet : Network.Testnet;
      const endpoints = getNetworkEndpoints(network);

      const broadcaster = new MsgBroadcaster({
        walletStrategy: walletStrategy,
        network,
        endpoints,
        simulateTx: true,
        gasBufferCoefficient: 1.2,
      });

      const result = await broadcaster.broadcastV2({
        msgs: msg,
        injectiveAddress: address,
      });

      showTransactionToast.dismiss(toastId);
      showTransactionToast.success(
        result.txHash,
        actionType === 'spin' ? 'Spin successful!' :
        actionType === 'harvest' ? 'Rewards harvested!' :
        actionType === 'ascend' ? 'Ascension complete!' :
        actionType === 'mint' ? 'Mushroom minted!' :
        'Transaction successful!'
      );

      await new Promise(resolve => setTimeout(resolve, 3000));
      setRefreshTrigger(prev => prev + 1);

      return result;
    } catch (e: any) {
      console.error('Transaction Failed:', e);
      showTransactionToast.dismiss(toastId);
      showTransactionToast.error(
        e?.message || 'Transaction failed. Please try again.'
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleMint = async () => {
    if (!address) return;
    const msg = shroomService.makeMintMsg(address);
    await executeTransaction(msg, 'mint');
  };

  const GalleryWrapper = ({ address, refreshTrigger }) => {
    const { tokenId } = useParams();
    return <MushroomGallery address={address} currentTokenId={tokenId || ''} refreshTrigger={refreshTrigger} />;
  };

  return (
    <BrowserRouter>
      <ToastProvider />
      <div className="min-h-screen bg-background">
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-text mb-4">
              Evolve Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Mushroom</span>
            </h2>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto mb-8">
              A strategy GameFi experience on Injective. Roll traits, harvest rewards, and ascend to prestige levels.
            </p>

            <div className="flex justify-center mb-8">
              <div>
                <WalletConnect onAddressChange={setAddress} />
                {address && (
                  <div className='mt-5'>
                    <button
                      onClick={handleMint}
                      disabled={isLoading}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlusCircle size={16} />
                      Mint New Shroom
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {address && (
              <div className="w-full md:w-auto">
                <Routes>
                  <Route path="/play/:tokenId" element={<GalleryWrapper address={address} refreshTrigger={refreshTrigger} />} />
                  <Route path="*" element={<GalleryWrapper address={address} refreshTrigger={refreshTrigger} />} />
                </Routes>
              </div>
            )}

            <div className="flex-1 w-full">
              {address ? (
                <Routes>
                  <Route path="/play/:tokenId" element={
                    <GameContainer
                      address={address}
                      refreshTrigger={refreshTrigger}
                      setRefreshTrigger={setRefreshTrigger}
                      executeTransaction={executeTransaction}
                      isLoading={isLoading}
                    />
                  } />
                  <Route path="*" element={
                    <div className="bg-surface rounded-3xl p-12 border border-border text-center">
                      <p>Select a mushroom to start playing.</p>
                    </div>
                  } />
                </Routes>
              ) : (
                <div className="bg-surface rounded-3xl p-12 text-center">
                  Connect Wallet
                </div>
              )}
            </div>
          </div>

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
                <Sprout size={24} className="text-success" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Earn Rewards</h3>
              <p className="text-sm text-textSecondary">
                Every spin contributes to a reward pool. Harvest your share based on your mushroom's power.
              </p>
            </div>

            <div className="bg-surface rounded-2xl p-6 border border-border">
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center mb-4">
                <Sprout size={24} className="text-warning" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Prestige System</h3>
              <p className="text-sm text-textSecondary">
                Reach +9 score to attempt ascension. Increase your substrate level for permanent bonuses.
              </p>
            </div>
          </div>
        </main>

        <footer className="border-t border-border mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-sm text-textSecondary">
              <p>Built on Injective Protocol • Powered by CosmWasm</p>
              <p className="mt-2">© 2025 SporeFates. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
