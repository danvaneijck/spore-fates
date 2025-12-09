import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, CheckCircle, Plus } from 'lucide-react';
import { shroomService } from '../services/shroomService';
import { MsgBroadcaster } from "@injectivelabs/wallet-core";
import { walletStrategy } from './WalletConnect';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { NETWORK_CONFIG } from '../config';
import { BatchMintModal } from './BatchMintModal'; // Import Modal
import { showTransactionToast } from '../utils/toast';

interface Props {
    address: string;
    currentTokenId: string;
    refreshTrigger: number;
}

export const MushroomGallery: React.FC<Props> = ({ address, currentTokenId, refreshTrigger }) => {
    const [tokens, setTokens] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [isMintModalOpen, setIsMintModalOpen] = useState(false);
    const [isMinting, setIsMinting] = useState(false);

    const navigate = useNavigate();

    // Fetch Tokens (Existing logic)
    const fetchTokens = useCallback(async () => {
        setIsLoading(true);
        const list = await shroomService.getTokensOwned(address);
        setTokens(list);
        setIsLoading(false);
    }, [address]);

    useEffect(() => {
        if (!address) return;
        fetchTokens();
    }, [address, fetchTokens, refreshTrigger]);

    const handleSelect = (id: string) => {
        navigate(`/play/${id}`);
    };

    // --- BATCH MINT HANDLER ---
    const handleBatchMint = async (count: number) => {
        setIsMinting(true);
        const toastId = showTransactionToast.loading(`Cultivating ${count} mushrooms...`);

        try {
            // 1. Generate Batch Messages
            const msgs = await shroomService.makeBatchMintMsgs(address, count);

            // 2. Broadcast
            const network = NETWORK_CONFIG.network === "mainnet" ? Network.Mainnet : Network.Testnet;
            const endpoints = getNetworkEndpoints(network);
            const broadcaster = new MsgBroadcaster({
                walletStrategy: walletStrategy,
                network,
                endpoints,
                simulateTx: true,
            });

            await broadcaster.broadcastV2({
                msgs: msgs,
                injectiveAddress: address,
            });

            showTransactionToast.dismiss(toastId);
            showTransactionToast.success("Batch mint successful! refreshing colony...");

            // 3. Cleanup
            setIsMintModalOpen(false);
            await new Promise(r => setTimeout(r, 2000)); // Wait for indexer
            fetchTokens(); // Refresh list

        } catch (e: any) {
            console.error(e);
            showTransactionToast.dismiss(toastId);
            showTransactionToast.error(e.message || "Mint failed");
        } finally {
            setIsMinting(false);
        }
    };

    if (!address) return null;

    return (
        <div className="m-auto max-w-sm bg-surface/50 border border-border rounded-xl p-4 h-fit mb-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-text font-bold flex items-center gap-2">
                    <Sprout size={18} />
                    Your Colony ({tokens.length})
                </h3>

                {/* Mint Button */}
                <button
                    onClick={() => setIsMintModalOpen(true)}
                    className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors border border-primary/20"
                    title="Mint New Mushroom"
                >
                    <Plus size={16} />
                </button>
            </div>

            {isLoading && !tokens ? (
                <div className="text-textSecondary text-sm">Loading spores...</div>
            ) : tokens.length === 0 ? (
                <div className="text-textSecondary text-sm italic py-4 text-center">
                    No mushrooms found. <br />
                    <button
                        onClick={() => setIsMintModalOpen(true)}
                        className="text-primary hover:underline mt-1 font-bold"
                    >
                        Mint one to start!
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {tokens.sort((a, b) => parseInt(a) - parseInt(b)).map((id) => (
                        <button
                            key={id}
                            onClick={() => handleSelect(id)}
                            className={`
                                relative aspect-square rounded-lg border flex flex-col items-center justify-center transition-all
                                ${id === currentTokenId
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-background border-border text-textSecondary hover:border-primary/50'}
                            `}
                        >
                            <Sprout size={20} />
                            <span className="text-xs mt-1 font-mono">#{id}</span>

                            {id === currentTokenId && (
                                <div className="absolute -top-1 -right-1">
                                    <CheckCircle size={12} className="fill-background text-primary" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Batch Mint Modal */}
            <BatchMintModal
                isOpen={isMintModalOpen}
                onClose={() => setIsMintModalOpen(false)}
                onConfirm={handleBatchMint}
                isLoading={isMinting}
            />
        </div>
    );
};