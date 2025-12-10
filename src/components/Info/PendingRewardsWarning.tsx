import React, { useEffect, useState } from 'react';
import { shroomService } from '../../services/shroomService';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { NETWORK_CONFIG } from '../../config';

interface Props {
    parentAId: string;
    parentBId: string | null;
}

export const PendingRewardsWarning: React.FC<Props> = ({ parentAId, parentBId }) => {
    const [rewardsA, setRewardsA] = useState<string>('0');
    const [rewardsB, setRewardsB] = useState<string>('0');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRewards = async () => {
            setLoading(true);

            // Fetch Parent A
            const resultA = await shroomService.getPendingRewards(parentAId);
            // Handle both object format (new) or string format (old service)
            const valA = typeof resultA === 'object' ? resultA.accumulated : resultA;
            setRewardsA(valA);

            // Fetch Parent B if selected
            if (parentBId) {
                const resultB = await shroomService.getPendingRewards(parentBId);
                const valB = typeof resultB === 'object' ? resultB.accumulated : resultB;
                setRewardsB(valB);
            } else {
                setRewardsB('0');
            }

            setLoading(false);
        };

        fetchRewards();
    }, [parentAId, parentBId]);

    // Format helper
    const format = (val: string) => (parseInt(val) / Math.pow(10, NETWORK_CONFIG.paymentDecimals));

    const amountA = format(rewardsA);
    const amountB = format(rewardsB);
    const total = amountA + amountB;

    if (loading) return (
        <div className="flex items-center justify-center p-2 text-xs text-textSecondary">
            <Loader2 size={12} className="animate-spin mr-2" /> Checking pending rewards...
        </div>
    );

    // If no rewards at risk, show nothing or a "Safe" message
    if (total <= 0) return null;

    return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                    <h4 className="text-sm font-bold text-red-400 mb-1">Unclaimed Rewards Detected</h4>
                    <p className="text-xs text-textSecondary mb-2">
                        These mushrooms are holding rewards. Splicing will burn the NFTs and <strong>forfeit these funds forever</strong>.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-black/20 p-2 rounded flex justify-between">
                            <span className="text-textSecondary">Parent #{parentAId}:</span>
                            <span className="font-mono text-red-300">{amountA.toFixed(3)} {NETWORK_CONFIG.paymentSymbol}</span>
                        </div>
                        {parentBId && (
                            <div className="bg-black/20 p-2 rounded flex justify-between">
                                <span className="text-textSecondary">Parent #{parentBId}:</span>
                                <span className="font-mono text-red-300">{amountB.toFixed(3)} {NETWORK_CONFIG.paymentSymbol}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-2 text-right">
                        <span className="text-xs font-bold text-red-500">Total at Risk: {total.toFixed(3)} {NETWORK_CONFIG.paymentSymbol}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};