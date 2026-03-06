import React from 'react';
import { X, Wallet } from 'lucide-react';
import { Wallet as WalletType } from '@injectivelabs/wallet-base';
import { Loader2 } from 'lucide-react';
import { useWalletConnect } from '../Wallet/WalletConnect';

export const WalletSelectModal: React.FC = () => {
    const { showWallets, setShowWallets, connect } = useWalletConnect();
    const [isConnecting, setIsConnecting] = React.useState<WalletType | null>(null);

    if (!showWallets) return null;

    const handleConnect = async (type: WalletType) => {
        setIsConnecting(type);
        connect(type);
        setIsConnecting(null);
    };

    const WalletOption = ({ type, name, icon, color }: { type: WalletType, name: string, icon: React.ReactNode, color: string }) => (
        <button
            onClick={() => handleConnect(type)}
            className={`
        w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 
        hover:bg-white/10 hover:border-${color}/50 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]
        transition-all duration-200 group
      `}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-black/30 rounded-lg text-2xl">
                    {icon}
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-bold text-text group-hover:text-white">{name}</span>
                    <span className="text-xs text-textSecondary">Connect using {name}</span>
                </div>
            </div>

            {isConnecting === type && <Loader2 className="animate-spin text-primary" />}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={() => setShowWallets(false)}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Wallet className="text-primary" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
                    </div>
                    <button
                        onClick={() => setShowWallets(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} className="text-textSecondary" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3">
                    <p className="text-sm text-textSecondary mb-4">
                        Select a wallet to connect to the Spore Fates ecosystem.
                    </p>

                    <WalletOption
                        type={WalletType.Keplr}
                        name="Keplr"
                        icon="⚛️" // Replace with <img src={keplrLogo} />
                        color="blue-500"
                    />

                    {/* <WalletOption
                        type={WalletType.Leap}
                        name="Leap"
                        icon="🐸" // Replace with <img src={leapLogo} />
                        color="green-500"
                    />

                    <WalletOption
                        type={WalletType.Metamask}
                        name="MetaMask"
                        icon="🦊" // Replace with <img src={metamaskLogo} />
                        color="orange-500"
                    /> */}
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 text-center border-t border-white/5">
                    <p className="text-xs text-textSecondary">
                        New to Injective? <a href="https://injective.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">Learn more</a>
                    </p>
                </div>
            </div>
        </div>
    );
};