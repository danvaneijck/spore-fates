import { useState } from 'react';
import { WalletConnect, walletStrategy } from './components/Wallet/WalletConnect';
import { ToastProvider } from './components/ToastProvider';
import { Sprout, Github, Twitter, BookOpen, Home } from 'lucide-react';
import { MsgBroadcaster } from "@injectivelabs/wallet-core";
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { NETWORK_CONFIG } from './config';
import { showTransactionToast } from './utils/toast';
import { About } from './pages/about';
import GameDashboard from './components/GameDashboard';


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


  return (
    <BrowserRouter>
      <ToastProvider />
      <div className="min-h-screen bg-background">

        {/* HEADER */}
        <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">

              {/* Logo */}
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
                  <Sprout size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text">SporeFates</h1>
                  <p className="text-xs text-textSecondary">Evolve Your Mushroom NFTs</p>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1 bg-surface border border-border rounded-full px-2 py-1">
                <Link to="/" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text hover:text-primary rounded-full hover:bg-background transition-all">
                  <Home size={16} /> Colony
                </Link>
                <Link to="/about" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text hover:text-primary rounded-full hover:bg-background transition-all">
                  <BookOpen size={16} /> Rules & Mechanics
                </Link>
              </nav>

              {/* Socials */}
              <div className="flex items-center gap-4">
                <a href="https://github.com/danvaneijck/spore-fates" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-background rounded-lg transition-colors">
                  <Github size={20} className="text-textSecondary hover:text-text" />
                </a>
                <a href="https://x.com/trippy_inj" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-background rounded-lg transition-colors">
                  <Twitter size={20} className="text-textSecondary hover:text-text" />
                </a>
              </div>
              <WalletConnect onAddressChange={setAddress} />
            </div>
          </div>
        </header>

        <main className="mx-auto px-4 sm:px-6 lg:px-10 ">
          <Routes>
            {/* Route for the Rules Page */}
            <Route path="/about" element={<About />} />
            {/* 
              Route for the Main Game. 
              The '/*' allows nested routes inside GameDashboard (like /play/:id) to work.
            */}

            <Route path="/*" element={
              <GameDashboard
                address={address}
                setAddress={setAddress}
                refreshTrigger={refreshTrigger}
                setRefreshTrigger={setRefreshTrigger}
                executeTransaction={executeTransaction}
                isLoading={isLoading}
              />
            } />
          </Routes>
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