// src/components/GameContainer.tsx

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DRAND_HASH, RewardInfo, shroomService, TraitExtension } from "../services/shroomService";
import { findAttribute, parseSpinResult, SpinResult } from "../utils/transactionParser";
import { Dna, FlaskConical, Sprout } from "lucide-react";
import { SpinInterface } from "./Mutations/SpinInterface";
import { SpinWheel } from "./Mutations/SpinWheel";
import { BreedingInterface } from "./Breeding/BreedingInterface";
import { useWalletStore } from "../store/walletStore";
import { useGameStore } from "../store/gameStore";
import { useTransaction } from "../hooks/useTransaction";
import { SporeLogo } from "./Logo/SporeLogo";


const GameContainer = () => {

    const { connectedWallet: address } = useWalletStore();
    const { refreshTrigger, triggerRefresh } = useGameStore();
    const { executeTransaction, isLoading } = useTransaction();

    const [activeTab, setActiveTab] = useState<'mutate' | 'breed'>('mutate');
    const { tokenId } = useParams();

    const [spinStage, setSpinStage] = useState<'idle' | 'requesting' | 'waiting_drand' | 'resolving' | 'ready_to_reveal'>('idle');
    const [pendingRound, setPendingRound] = useState<number | null>(null);

    const [traits, setTraits] = useState<TraitExtension>({
        cap: 0, stem: 0, spores: 0, substrate: 0,
        base_cap: 0, base_stem: 0, base_spores: 0,
        genome: []
    });

    const [globalShares, setGlobalShares] = useState<string>('0');

    const [rewardInfo, setRewardInfo] = useState<RewardInfo>({ accumulated: '0', multiplier: '1', payout: '0' });

    // Spin wheel state
    const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
    const [showWheel, setShowWheel] = useState(false);
    const [pendingTraitUpdate, setPendingTraitUpdate] = useState<TraitExtension | null>(null);

    const handleResolve = useCallback(async (round: number) => {
        setSpinStage('resolving');
        const msgs = await shroomService.makeResolveBatchMsg(address, tokenId, round);
        const result = await executeTransaction(msgs, 'resolve_spin');

        if (result) {
            const parsed = parseSpinResult(result);
            if (parsed) {
                setSpinResult(parsed);
                setShowWheel(true);
            }
        }
        setSpinStage('idle');
    }, [address, executeTransaction, tokenId]);

    const manualResolve = async () => {
        if (!pendingRound) return;
        await handleResolve(pendingRound);
    };

    const waitForDrand = useCallback(async (round: number) => {
        const checkDrand = setInterval(async () => {
            try {
                const response = await fetch(`https://api.drand.sh/${DRAND_HASH}/public/${round}`);
                if (response.ok) {
                    clearInterval(checkDrand);
                    setSpinStage('ready_to_reveal');
                }
            } catch (e) { /* ignore */ }
        }, 1000);
        return () => clearInterval(checkDrand);
    }, []);


    useEffect(() => {
        if (!address || !tokenId) return;

        const fetchData = async () => {
            // 1. Fetch Traits
            const traitData = await shroomService.getShroomTraits(tokenId);
            if (traitData) {
                if (!showWheel) setTraits(traitData);
                else setPendingTraitUpdate(traitData);
            }

            // 2. Fetch Rewards
            const rewards = await shroomService.getPendingRewards(tokenId);
            setRewardInfo(rewards);

            const gState = await shroomService.getGlobalState();
            if (gState) {
                setGlobalShares(gState.total_shares);
            }
        };

        fetchData();
    }, [address, tokenId, refreshTrigger, showWheel]);

    // RESUME STATE ON LOAD
    useEffect(() => {
        if (!tokenId) return;

        const checkPendingState = async () => {
            const status = await shroomService.getPendingSpinStatus(tokenId);

            if (status.is_pending) {
                console.log(`Found pending spin for round ${status.target_round}`);
                setPendingRound(status.target_round);

                try {
                    const response = await fetch(`https://api.drand.sh/${DRAND_HASH}/public/${status.target_round}`);
                    if (response.ok) {
                        setSpinStage('ready_to_reveal');
                    } else {
                        setSpinStage('waiting_drand');
                        waitForDrand(status.target_round);
                    }
                } catch (e) {
                    setSpinStage('waiting_drand');
                    waitForDrand(status.target_round);
                }
            } else {
                setSpinStage('idle');
            }
        };

        checkPendingState();
    }, [tokenId, waitForDrand]);

    const onSpin = async (target) => {
        setSpinStage('requesting');
        const cost = shroomService.getSpinCost(traits.substrate);
        const msg = shroomService.makeRequestSpinMsg(address, tokenId, target, cost);
        const result = await executeTransaction(msg, 'request_spin');

        if (result) {
            const round = findAttribute(result, "wasm", 'target_round');
            setPendingRound(parseInt(round));
            setSpinStage('waiting_drand');
            waitForDrand(parseInt(round));
        } else {
            setSpinStage('idle');
        }
    };

    const onHarvest = async () => {
        if (!tokenId) return;
        const msg = shroomService.makeHarvestMsg(address, tokenId);
        return await executeTransaction(msg, 'harvest');
    };

    const onAscend = async () => {
        if (!tokenId) return;
        const msg = shroomService.makeAscendMsg(address, tokenId);
        return await executeTransaction(msg, 'ascend');
    };

    const handleWheelComplete = () => {
        setShowWheel(false);
        setSpinResult(null);
        if (pendingTraitUpdate) {
            setTraits(pendingTraitUpdate);
            setPendingTraitUpdate(null);
        }
        triggerRefresh();
    };

    if (!tokenId) {
        return (
            <div className="bg-surface rounded-3xl p-4 md:p-12 border border-border text-center h-full flex items-center justify-center min-h-[600px]">
                <div>
                    <SporeLogo size={60} />
                    <h3 className="text-2xl font-bold text-text mb-2">Select a Mushroom</h3>
                    <p className="text-textSecondary">
                        Choose a mushroom from your colony on the left to start playing!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="m-auto w-full bg-surface rounded-3xl p-2 md:p-6 border border-border h-full">

            {/* TAB NAVIGATION */}
            <div className="flex p-1 bg-background rounded-xl border border-border mb-6">
                <button
                    onClick={() => setActiveTab('mutate')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all
            ${activeTab === 'mutate' ? 'bg-surface text-primary shadow-sm' : 'text-textSecondary hover:text-text'}`}
                >
                    <FlaskConical size={16} /> Mutate & Harvest
                </button>
                <button
                    onClick={() => setActiveTab('breed')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all
            ${activeTab === 'breed' ? 'bg-surface text-purple-400 shadow-sm' : 'text-textSecondary hover:text-text'}`}
                >
                    <Dna size={16} /> Genetic Splicing
                </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'mutate' ? (
                <>
                    <SpinInterface
                        tokenId={tokenId}
                        traits={traits}
                        onSpin={onSpin}
                        onHarvest={onHarvest}
                        onAscend={onAscend}
                        onReveal={manualResolve}
                        spinStage={spinStage}
                        rewardInfo={rewardInfo}
                        isLoading={isLoading}
                        globalTotalShares={parseFloat(globalShares)}
                    />
                </>
            ) : (
                <BreedingInterface
                    address={address}
                    parentAId={tokenId}
                    parentATraits={traits}
                    executeTransaction={executeTransaction}
                    isLoading={isLoading}
                />
            )}

            {spinResult && (
                <SpinWheel
                    isSpinning={showWheel}
                    oldValue={spinResult.oldValue}
                    newValue={spinResult.newValue}
                    traitTarget={spinResult.traitTarget}
                    onComplete={handleWheelComplete}
                />
            )}
        </div>
    );
};

export default GameContainer;