import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Coins, Plus, Minus } from 'lucide-react';
import { NETWORK_CONFIG } from '../config';
import { shroomService } from '../services/shroomService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (count: number) => Promise<void>;
    isLoading: boolean;
}

export const BatchMintModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [count, setCount] = useState(1);
    const [basePrice, setBasePrice] = useState<bigint>(BigInt(0));
    const [increment, setIncrement] = useState<bigint>(BigInt(0));
    const [totalCost, setTotalCost] = useState<string>('0');

    // Fetch pricing data when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    // 1. Get the current price from the bonding curve
                    const price = await shroomService.getCurrentMintPrice();

                    // 2. Get the slope (increment) from the contract config
                    const config = await shroomService.getGameConfig();

                    setBasePrice(BigInt(price));
                    setIncrement(BigInt(config?.mint_cost_increment || "0"));
                } catch (error) {
                    console.error("Failed to fetch batch pricing:", error);
                    // Fallback to safety defaults
                    setBasePrice(BigInt(0));
                    setIncrement(BigInt(0));
                }
            };
            fetchData();
        }
    }, [isOpen]);

    // Recalculate total cost when count changes
    useEffect(() => {
        let total = BigInt(0);
        for (let i = 0; i < count; i++) {
            total += basePrice + (increment * BigInt(i));
        }

        // Format for display
        const readable = (Number(total) / Math.pow(10, NETWORK_CONFIG.paymentDecimals)).toFixed(2);
        setTotalCost(readable);
    }, [count, basePrice, increment]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-border w-full max-w-md rounded-3xl p-6 relative animate-in zoom-in duration-200">

                <button onClick={onClose} className="absolute top-4 right-4 text-textSecondary hover:text-text">
                    <X size={24} />
                </button>

                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl mb-3 text-primary">
                        <Sparkles size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-text">Mass Cultivation</h3>
                    <p className="text-textSecondary text-sm">Mint multiple mushrooms at once.</p>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center justify-between bg-background rounded-xl p-4 border border-border mb-6">
                    <span className="text-text font-bold">Quantity</span>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCount(Math.max(1, count - 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-border hover:border-primary text-text transition-colors"
                        >
                            <Minus size={16} />
                        </button>
                        <span className="text-xl font-mono font-bold w-8 text-center text-white">{count}</span>
                        <button
                            onClick={() => setCount(Math.min(10, count + 1))} // Cap at 10 for safety
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-border hover:border-primary text-text transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Cost Summary */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-textSecondary">Estimated Cost</span>
                        <div className="flex items-center gap-2 text-primary font-bold">
                            <Coins size={16} />
                            <span>{totalCost} {NETWORK_CONFIG.paymentSymbol}</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-textSecondary opacity-70">
                        *Price increases slightly per mint due to bonding curve.
                    </p>
                </div>

                <button
                    onClick={() => onConfirm(count)}
                    disabled={isLoading}
                    className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <><Loader2 className="animate-spin" /> Cultivating...</>
                    ) : (
                        <>Mint {count} Mushrooms</>
                    )}
                </button>

            </div>
        </div>
    );
};