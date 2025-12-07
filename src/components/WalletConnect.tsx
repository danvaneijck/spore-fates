import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, LogOut } from 'lucide-react';
import { WalletStrategy } from '@injectivelabs/wallet-strategy';
import { Wallet as WalletType } from '@injectivelabs/wallet-base';
import { ChainId } from '@injectivelabs/ts-types';
import { getInjectiveAddress } from '@injectivelabs/sdk-ts';

interface WalletConnectProps {
  onAddressChange: (address: string) => void;
}

export const walletStrategy = new WalletStrategy({
  chainId: ChainId.Testnet,
  strategies: {},

});

export const WalletConnect: React.FC<WalletConnectProps> = ({ onAddressChange }) => {
  const [address, setAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const wallets = [
    { type: WalletType.Keplr, name: 'Keplr', icon: '🔐' },
    { type: WalletType.Leap, name: 'Leap', icon: '🦘' },
    { type: WalletType.Metamask, name: 'MetaMask', icon: '🦊' },
  ];

  const connectWallet = async (walletType: WalletType) => {
    setIsConnecting(true);
    setShowWalletMenu(false);

    try {
      walletStrategy.setWallet(walletType);
      const addresses = await walletStrategy.getAddresses();

      // Convert to Injective address if needed (for EVM wallets)
      const injectiveAddress = walletType === WalletType.Metamask
        ? getInjectiveAddress(addresses[0])
        : addresses[0];

      setAddress(injectiveAddress);
      onAddressChange(injectiveAddress);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please make sure your wallet extension is installed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress('');
    onAddressChange('');
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  return (
    <div className="relative">
      {!address ? (
        <div className="relative">
          <button
            onClick={() => setShowWalletMenu(!showWalletMenu)}
            disabled={isConnecting}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet size={20} />
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            <ChevronDown size={16} className={`transition-transform ${showWalletMenu ? 'rotate-180' : ''}`} />
          </button>

          {showWalletMenu && (
            <div className="absolute top-full mt-2 right-0 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden min-w-[200px] z-50">
              {wallets.map((wallet) => (
                <button
                  key={wallet.type}
                  onClick={() => connectWallet(wallet.type)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background transition-colors text-left"
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <span className="text-text font-medium">{wallet.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-6 py-3 bg-surface border border-border rounded-2xl">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-text font-mono text-sm">{formatAddress(address)}</span>
          <button
            onClick={disconnect}
            className="ml-2 p-2 hover:bg-background rounded-lg transition-colors"
            title="Disconnect"
          >
            <LogOut size={16} className="text-textSecondary hover:text-error" />
          </button>
        </div>
      )}
    </div>
  );
};
