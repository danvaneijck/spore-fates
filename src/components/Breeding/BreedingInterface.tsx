import React, { useState } from 'react';
import { TraitExtension, shroomService } from '../../services/shroomService';
import { NETWORK_CONFIG } from '../../config';
import { MushroomRenderer } from '../Mushroom/MushroomRenderer';
import { GeneticsDisplay } from '../Mushroom/GeneticsDisplay';
import { PartnerSelector } from './PartnerSelector';
import { GitMerge, Loader2 } from 'lucide-react';
import { SpliceModal } from '../Modals/SpliceModal';
import { NewMushroomReveal } from '../Overlays/NewMushroomReveal';
import { useNavigate } from 'react-router-dom';
import { findAttribute } from '../../utils/transactionParser';
import { GeneticSimulator } from './GeneticSimulator';
import { PendingRewardsWarning } from '../Info/PendingRewardsWarning';

interface Props {
    address: string;
    parentAId: string;
    parentATraits: TraitExtension;
    executeTransaction: (msg: any, type: string) => Promise<any>;
    isLoading: boolean;
}

export const BreedingInterface: React.FC<Props> = ({
    address,
    parentAId,
    parentATraits,
    executeTransaction,
    isLoading
}) => {
    const navigate = useNavigate();

    const [parentBId, setParentBId] = useState<string | null>(null);
    const [parentBTraits, setParentBTraits] = useState<TraitExtension | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const [revealOpen, setRevealOpen] = useState(false);
    const [newChildId, setNewChildId] = useState<string | null>(null);
    const [newChildTraits, setNewChildTraits] = useState<TraitExtension | null>(null);

    const handleSelectPartner = (id: string, traits: TraitExtension) => {
        setParentBId(id);
        setParentBTraits(traits);
    };

    const handleSplice = async () => {
        if (!parentBId) return;

        // 1. Check Approval
        const isApproved = await shroomService.isApprovedForAll(address, NETWORK_CONFIG.gameControllerAddress);

        if (!isApproved) {
            // Step A: Approve
            const approveMsg = shroomService.makeApproveAllMsg(address, NETWORK_CONFIG.gameControllerAddress);
            const res = await executeTransaction(approveMsg, 'approve', true);
            if (!res) return; // Stop if failed
        }

        // 2. Open Confirmation Modal for Step B (Burn & Splice)
        setShowConfirm(true);
    };

    const confirmSplice = async () => {
        if (!parentBId) return;
        setShowConfirm(false);

        // 1. Execute Splice
        const msg = shroomService.makeSpliceMsg(address, parentAId, parentBId);
        const result = await executeTransaction(msg, 'splice', true);

        if (result) {
            // 2. Find Child ID from logs
            // CosmWasm usually emits 'wasm-splice' event with 'child_id' attribute
            const childId = findAttribute(result, 'splice', 'child_id');

            if (childId) {
                setNewChildId(childId);

                // 3. Fetch New Child Data (with a tiny delay to ensure indexer/node caught up)
                setTimeout(async () => {
                    const traits = await shroomService.getShroomTraits(childId);
                    setNewChildTraits(traits);
                    setRevealOpen(true);
                }, 1000);
            }
        }

        // Reset selection
        setParentBId(null);
        setParentBTraits(null);
    };

    // Helper to parse logs


    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: Breeding Lab */}
            <div className="bg-surface rounded-3xl p-8 border border-border flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <GitMerge className="text-purple-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-text">Mycelial Splicing</h3>
                        <p className="text-xs text-textSecondary">Burn two to create a new strain.</p>
                    </div>
                </div>

                {/* Breeding Visualizer */}
                <div className="flex items-center justify-between gap-2 mb-8">
                    {/* Parent A */}
                    <div className="flex-1 flex flex-col items-center">
                        <span className="text-xs font-bold text-textSecondary mb-2">Parent A</span>
                        <div className="w-full aspect-square bg-background rounded-xl border border-border p-2 mb-2">
                            <MushroomRenderer traits={parentATraits} />
                        </div>
                        <span className="text-white font-mono text-sm">#{parentAId}</span>
                    </div>

                    {/* Icon */}
                    <div className="flex flex-col items-center justify-center text-purple-400">
                        <PlusIcon />
                    </div>

                    {/* Parent B */}
                    <div className="flex-1 flex flex-col items-center relative">
                        <span className="text-xs font-bold text-textSecondary mb-2">Parent B</span>
                        <div className={`w-full aspect-square bg-background rounded-xl border-2 border-dashed p-2 mb-2 flex items-center justify-center
                    ${parentBId ? 'border-primary' : 'border-border'}`}>
                            {parentBTraits ? (
                                <MushroomRenderer traits={parentBTraits} />
                            ) : (
                                <span className="text-xs text-textSecondary">Select Partner</span>
                            )}
                        </div>
                        <span className="text-white font-mono text-sm">{parentBId ? `#${parentBId}` : '---'}</span>

                        {parentBId && (
                            <button
                                onClick={() => { setParentBId(null); setParentBTraits(null); }}
                                className="absolute -top-1 -right-1 bg-surface border border-border rounded-full p-1 hover:text-red-500"
                            >
                                <span className="sr-only">Remove</span>
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {/* Comparison / Stats */}
                {parentBTraits && (
                    <GeneticSimulator
                        genomeA={parentATraits.genome}
                        genomeB={parentBTraits.genome}
                    />
                )}

                <PendingRewardsWarning
                    parentAId={parentAId}
                    parentBId={parentBId}
                />

                {/* Action Button */}
                <div className="mt-auto">
                    <button
                        onClick={handleSplice}
                        disabled={isLoading || !parentBId}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <GitMerge />}
                        {parentBId ? 'Initiate Splicing Ritual' : 'Select Partner to Breed'}
                    </button>
                    <p className="text-center text-xs text-textSecondary mt-3">
                        ⚠️ Warning: Both parents will be permanently burned.
                    </p>
                </div>
            </div>

            {/* RIGHT: Partner Selection */}
            <div className="space-y-6">
                <div className="bg-surface rounded-3xl p-6 border border-border">
                    <h3 className="text-lg font-bold text-text mb-4">Select Breeding Partner</h3>
                    <PartnerSelector
                        parentAGenome={parentATraits.genome}
                        address={address}
                        excludeId={parentAId}
                        selectedId={parentBId}
                        onSelect={handleSelectPartner}
                    />
                </div>

                {/* Genetic Preview - Parent A */}
                <div className="bg-surface rounded-3xl p-6 border border-border opacity-70">
                    <div className="text-xs font-bold text-textSecondary mb-2 uppercase">Parent A Genetics</div>
                    <GeneticsDisplay genome={parentATraits.genome} baseStats={parentATraits} />
                </div>

                {/* Genetic Preview - Parent B */}
                {parentBTraits && (
                    <div className="bg-surface rounded-3xl p-6 border border-border">
                        <div className="text-xs font-bold text-textSecondary mb-2 uppercase">Parent B Genetics</div>
                        <GeneticsDisplay genome={parentBTraits.genome} baseStats={parentBTraits} />
                    </div>
                )}
            </div>

            {/* NEW REVEAL MODAL */}
            <NewMushroomReveal
                isOpen={revealOpen}
                onClose={() => {
                    setRevealOpen(false);
                    if (newChildId) {
                        navigate(`/play/${newChildId}`);
                        window.scrollTo(0, 0);
                    }
                }}
                childId={newChildId}
                childTraits={newChildTraits}
            />

            <SpliceModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmSplice}
                parentA={parentAId}
                parentB={parentBId || ''}
            />
        </div>
    );
};

// Simple Plus Icon helper
const PlusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);