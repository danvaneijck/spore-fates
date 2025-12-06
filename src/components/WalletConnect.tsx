import React, { useState, useMemo } from 'react';
import { ChainId } from '@injectivelabs/ts-types';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { WalletStrategy } from '@injectivelabs/wallet-strategy';
import { Wallet } from '@injectivelabs/wallet-base';
import { getInjectiveAddress } from '@injectivelabs/sdk-ts';
import { Wallet as WalletIcon, LogOut } from 'lucide-react';

const walletStrategy = new WalletStrategy({
  chainId: ChainId.Testnet,
  strategies: {},
});

interface WalletConnectProps {
  onAddressChange: (address: string) => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ onAddressChange }) => {
  const [address, setAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const injectiveAddress = useMemo(() => {
    if (address) {
      return getInjectiveAddress(address);
    }
    return '';
  }, [address]);

  const connect = async (wallet: Wallet) => {
    try {
      setIsConnecting(true);
      walletStrategy.setWallet(wallet);
      const addresses = await walletStrategy.getAddresses();
      
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        setAddress(addr);
        onAddressChange(getInjectiveAddress(addr));
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress('');
    onAddressChange('');
  };

  if (address) {
    return (
      <div className="flex items-center gap-4 bg-surface rounded-2xl px-6 py-3 border border-border">
        <div className="flex-1">
          <div className="text-xs text-textSecondary mb-1">Connected</div>
          <div className="font-mono text-sm text-text">
            {injectiveAddress.slice(0, 12)}...{injectiveAddress.slice(-8)}
          </div>
        </div>
        <button
          onClick={disconnect}
          className="p-2 hover:bg-background rounded-lg transition-colors"
          title="Disconnect"
        >
          <LogOut size={20} className="text-textSecondary" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => connect(Wallet.Keplr)}
        disabled={isConnecting}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <WalletIcon size={20} />
        {isConnecting ? 'Connecting...' : 'Connect Keplr'}
      </button>
      
      <button
        onClick={() => connect(Wallet.Leap)}
        disabled={isConnecting}
        className="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <WalletIcon size={20} />
        {isConnecting ? 'Connecting...' : 'Connect Leap'}
      </button>
      
      <button
        onClick={() => connect(Wallet.Metamask)}
        disabled={isConnecting}
        className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <WalletIcon size={20} />
        {isConnecting ? 'Connecting...' : 'Connect Metamask'}
      </button>
    </div>
  );
};
