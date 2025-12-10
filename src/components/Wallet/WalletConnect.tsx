import { WalletStrategy } from '@injectivelabs/wallet-strategy';
import { Wallet } from '@injectivelabs/wallet-base';
import { ChainId, EvmChainId } from '@injectivelabs/ts-types';
import { getInjectiveAddress } from '@injectivelabs/sdk-ts';
import { useCallback, useEffect } from 'react';
import { useWalletStore } from '../../store/walletStore';
import { NETWORK_CONFIG } from '../../config';

const ethRpc = "https://1rpc.io/eth"
const testnetEthRpc = "https://gateway.tenderly.co/public/goerli"

// Initialize Strategy
export const walletStrategy = new WalletStrategy({
  chainId: NETWORK_CONFIG.chainId as ChainId,
  evmOptions: {

    evmChainId: NETWORK_CONFIG.network == "mainnet" ? EvmChainId.Mainnet : EvmChainId.Goerli,
    rpcUrl: NETWORK_CONFIG.network == "mainnet" ? ethRpc : testnetEthRpc,
  },
  strategies: {},
});

const getEthereum = () => {
  if (!window.ethereum) {
    throw new Error('Metamask extension not installed')
  }

  return window.ethereum
}

export const useWalletConnect = () => {
  const {
    connectedWallet,
    selectedWalletType,
    setConnectedWallet,
    setSelectedWalletType,
    showWallets,
    setShowWallets,
    disconnect: storeDisconnect
  } = useWalletStore();

  // --- Connect Logic ---
  const connect = useCallback(async (walletType: Wallet) => {
    try {
      walletStrategy.setWallet(walletType);

      let addresses = await walletStrategy.getAddresses();

      if (addresses.length === 0) {
        throw new Error(`No addresses found for ${walletType}`);
      }

      let injectiveAddress = addresses[0];

      if (walletType == "metamask" || walletType == "phantom") {
        const ethereum = getEthereum()
        addresses = await ethereum.request({
          method: 'eth_requestAccounts',
        })
        addresses = addresses.map(getInjectiveAddress)
        console.log(addresses)
      }


      // Special handling for Metamask (Convert ETH to INJ address)
      if (walletType === Wallet.Metamask) {
        injectiveAddress = getInjectiveAddress(addresses[0]);
      }

      setConnectedWallet(injectiveAddress);
      setSelectedWalletType(walletType);
      setShowWallets(false);

    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      alert(error.message || 'Failed to connect wallet');
    }
  }, [setConnectedWallet, setSelectedWalletType, setShowWallets]);

  // --- Disconnect Logic ---
  const disconnect = () => {
    storeDisconnect();
    // Optional: Refresh page to clear any cached SDK states
    // window.location.reload(); 
  };

  // --- Auto-Connect on Load ---
  useEffect(() => {
    if (selectedWalletType && !connectedWallet) {
      connect(selectedWalletType);
    }
  }, [connect, connectedWallet, selectedWalletType]);

  return {
    connect,
    disconnect,
    connectedWallet,
    selectedWalletType,
    showWallets,
    setShowWallets,
  };
};