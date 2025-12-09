import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EcosystemMetrics, shroomService, TraitExtension } from "../services/shroomService";
import { parseSpinResult, SpinResult } from "../utils/transactionParser";
import { NETWORK_CONFIG } from "../config";
import { Dna, FlaskConical, Sprout } from "lucide-react";
import { EcosystemWeather } from "./EcosystemWeather";
import { SpinInterface } from "./SpinInterface";
import { SpinWheel } from "./SpinWheel";
import { GeneticsDisplay } from "./GeneticsDisplay";
import { BreedingInterface } from "./BreedingInterface";


const GameContainer = ({ address, refreshTrigger, setRefreshTrigger, executeTransaction, isLoading }) => {

    const [activeTab, setActiveTab] = useState<'mutate' | 'breed'>('mutate'); // New Tab State

    const { tokenId } = useParams();

    const [traits, setTraits] = useState<TraitExtension>({
        cap: 0, stem: 0, spores: 0, substrate: 0,
        base_cap: 0, base_stem: 0, base_spores: 0,
        genome: []
    });

    const [metrics, setMetrics] = useState<EcosystemMetrics | null>(null);

    const [displayRewards, setDisplayRewards] = useState('0.00');

    // Spin wheel state
    const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
    const [showWheel, setShowWheel] = useState(false);
    const [pendingTraitUpdate, setPendingTraitUpdate] = useState<TraitExtension | null>(null);

    useEffect(() => {
        if (!address || !tokenId) return;

        const fetchData = async () => {
            // 1. Fetch Traits
            const traitData = await shroomService.getShroomTraits(tokenId);
            if (traitData) {
                if (!showWheel) setTraits(traitData);
                else setPendingTraitUpdate(traitData);
            }

            // 2. Fetch Global Weather
            const weatherData = await shroomService.getEcosystemMetrics();
            setMetrics(weatherData);

            // 3. Fetch Rewards
            const rewards = await shroomService.getPendingRewards(tokenId);
            const displayVal = (parseInt(rewards) / Math.pow(10, NETWORK_CONFIG.paymentDecimals));
            setDisplayRewards(displayVal.toFixed(2));
        };

        fetchData();
    }, [address, tokenId, refreshTrigger, showWheel]);

    const onSpin = async (target) => {
        if (!tokenId) return;
        const msg = shroomService.makeSpinMsg(address, tokenId, target);
        const result = await executeTransaction(msg, 'spin');

        if (result) {
            const parsed = parseSpinResult(result);
            if (parsed) {
                setSpinResult(parsed);
                setShowWheel(true);
            }
        }
    };

    const onHarvest = async () => {
        if (!tokenId) return;
        const msg = shroomService.makeHarvestMsg(address, tokenId);
        await executeTransaction(msg, 'harvest');
        setDisplayRewards('0.00');
    };

    const onAscend = async () => {
        if (!tokenId) return;
        const msg = shroomService.makeAscendMsg(address, tokenId);
        await executeTransaction(msg, 'ascend');
    };

    const handleWheelComplete = () => {
        setShowWheel(false);
        setSpinResult(null);

        // Apply pending trait update if we have one
        if (pendingTraitUpdate) {
            setTraits(pendingTraitUpdate);
            setPendingTraitUpdate(null);
        }

        // Trigger a refresh to ensure we have the latest data
        setRefreshTrigger(prev => prev + 1);
    };

    if (!tokenId) {
        return (
            <div className="bg-surface rounded-3xl p-4 md:p-12 border border-border text-center h-full flex items-center justify-center min-h-[600px]">
                <div>
                    <Sprout size={64} className="text-primary mx-auto mb-4 opacity-50" />
                    <h3 className="text-2xl font-bold text-text mb-2">Select a Mushroom</h3>
                    <p className="text-textSecondary">
                        Choose a mushroom from your colony on the left to start playing!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-screen-xl m-auto bg-surface rounded-3xl p-6 border border-border h-full">
            <EcosystemWeather metrics={metrics} />

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
                    <GeneticsDisplay
                        genome={traits.genome}
                        baseStats={{ cap: traits.base_cap, stem: traits.base_stem, spores: traits.base_spores }}
                    />
                    <SpinInterface
                        tokenId={tokenId}
                        traits={traits}
                        onSpin={onSpin}
                        onHarvest={onHarvest}
                        onAscend={onAscend}
                        pendingRewards={displayRewards}
                        isLoading={isLoading}
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