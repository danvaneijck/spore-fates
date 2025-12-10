import React, { useState, useRef, useEffect } from 'react';
import { Wallet, LogOut, ChevronDown, Copy, Check, ExternalLink } from 'lucide-react';
import { showTransactionToast } from '../../utils/toast';
import { useWalletConnect } from './WalletConnect';

export const WalletConnectButton: React.FC = () => {
    // 1. Consume the hook
    const { connectedWallet, setShowWallets, disconnect } = useWalletConnect();

    // Local state for UI interactions
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const handleCopy = async () => {
        if (connectedWallet) {
            await navigator.clipboard.writeText(connectedWallet);
            setCopied(true);
            showTransactionToast.success("Address copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDisconnect = () => {
        disconnect();
        setIsMenuOpen(false);
    };

    // --- RENDER: DISCONNECTED ---
    if (!connectedWallet) {
        return (
            <button
                onClick={() => setShowWallets(true)}
                className="group relative px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 overflow-hidden"
            >
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />

                <div className="relative flex items-center gap-2">
                    <Wallet size={18} className="group-hover:-rotate-12 transition-transform" />
                    <span>Connect Wallet</span>
                </div>
            </button>
        );
    }

    // --- RENDER: CONNECTED ---
    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`
                    flex items-center gap-3 pl-3 pr-2 py-2 rounded-xl border transition-all duration-200
                    ${isMenuOpen
                        ? 'bg-surface border-primary/50 ring-1 ring-primary/20'
                        : 'bg-surface/50 border-border hover:border-primary/30 hover:bg-surface'}
                `}
            >
                {/* Status Indicator */}
                <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </div>

                {/* Address */}
                <span className="font-mono text-sm font-bold text-text">
                    {formatAddress(connectedWallet)}
                </span>

                {/* Dropdown Icon */}
                <div className={`p-1 rounded-lg bg-black/20 text-textSecondary transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={14} />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-56 bg-[#121212] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-scale-in">

                    <div className="p-3 border-b border-white/5">
                        <p className="text-[10px] uppercase font-bold text-textSecondary mb-1">Active Account</p>
                        <div className="flex items-center justify-between bg-black/40 rounded-lg p-2 border border-white/5">
                            <span className="text-xs font-mono text-text truncate max-w-[120px]">
                                {formatAddress(connectedWallet)}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="text-textSecondary hover:text-white transition-colors"
                                title="Copy Address"
                            >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>

                    <div className="p-1">
                        <a
                            href={`https://explorer.injective.network/account/${connectedWallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-textSecondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ExternalLink size={14} />
                            View on Explorer
                        </a>

                        <button
                            onClick={handleDisconnect}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                        >
                            <LogOut size={14} />
                            Disconnect
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};