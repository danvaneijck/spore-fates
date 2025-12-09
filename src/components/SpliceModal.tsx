import React from 'react';
import { Flame, AlertTriangle, X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    parentA: string;
    parentB: string;
}

export const SpliceModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, parentA, parentB }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-red-500/30 w-full max-w-md rounded-3xl p-6 relative animate-in fade-in zoom-in duration-200">

                <button onClick={onClose} className="absolute top-4 right-4 text-textSecondary hover:text-text">
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                        <Flame size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-text mb-2">Permanent Burn Warning</h3>
                    <p className="text-textSecondary">
                        You are about to sacrifice Mushroom <strong>#{parentA}</strong> and <strong>#{parentB}</strong>.
                    </p>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                    <div className="flex gap-3">
                        <AlertTriangle className="text-red-500 shrink-0" size={20} />
                        <p className="text-sm text-red-200 text-left">
                            This action is <strong>irreversible</strong>. The parent NFTs will be destroyed forever.
                            One new child NFT will be minted with mixed genetics.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-background border border-border rounded-xl font-bold hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-600/20"
                    >
                        Confirm & Burn
                    </button>
                </div>
            </div>
        </div>
    );
};