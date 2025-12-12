// src/components/GameDashboard.tsx

import { Sprout } from "lucide-react";
import { MintInterface } from "./Mushroom/MintInterface";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import GameContainer from "./GameContainer";
import { MushroomGallery } from "./Mushroom/MushroomGallery";
import { shroomService, TraitExtension } from "../services/shroomService";
import { findAttribute } from "../utils/transactionParser";
import { useState } from "react";
import { NewMushroomReveal } from "./Overlays/NewMushroomReveal";
import { GlobalStatsBanner } from "./Banners/GlobalStatsBanner";
import { PlayerStatsCard } from "./Info/PlayerStatsCard";
import { EcosystemWeather } from "./Info/EcosystemWeather";
import { useWalletStore } from "../store/walletStore";
import { useGameStore } from "../store/gameStore";
import { useTransaction } from "../hooks/useTransaction";
import { SporeLogo } from "./Logo/SporeLogo";

const GalleryWrapper = () => {
    const { tokenId } = useParams();
    return (
        <MushroomGallery
            currentTokenId={tokenId || ''}
        />
    );
};

const GameDashboard = () => {
    const { connectedWallet: address } = useWalletStore();
    const { refreshTrigger } = useGameStore();

    const { executeTransaction, isLoading } = useTransaction();

    const navigate = useNavigate();
    const { triggerRefresh } = useGameStore();

    const [revealOpen, setRevealOpen] = useState(false);
    const [newMushroomId, setNewMushroomId] = useState<string | null>(null);
    const [newMushroomTraits, setNewMushroomTraits] = useState<TraitExtension | null>(null);

    const handleMint = async (priceRaw: string) => {
        if (!address) return;
        const msg = shroomService.makeMintMsg(address, priceRaw);
        const result = await executeTransaction(msg, 'mint', true);

        if (result) {
            const tokenId = findAttribute(result, "wasm", 'token_id');
            if (tokenId) {
                setNewMushroomId(tokenId);
                setTimeout(async () => {
                    const traits = await shroomService.getShroomTraits(tokenId);
                    if (traits) {
                        setNewMushroomTraits(traits);
                        setRevealOpen(true);
                    }
                }, 1000);
            }
        }
    };

    return (
        <>
            <GlobalStatsBanner refreshTrigger={refreshTrigger} />

            {address && (
                <div className="">
                    <PlayerStatsCard address={address} refreshTrigger={refreshTrigger} />
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start mt-4">
                {/* Left Column - Gallery */}
                {address && (
                    <div className="w-full lg:w-[420px]">
                        <EcosystemWeather />

                        <Routes>

                            <Route
                                path="/play/:tokenId"
                                element={<GalleryWrapper />}
                            />
                            <Route
                                path="*"
                                element={<GalleryWrapper />}
                            />
                        </Routes>
                    </div>
                )}

                {/* Right Column - Game Interface */}
                {address && (
                    <div className="flex-1 min-h-[600px] mb-10 flex flex-col gap-6">
                        <Routes>
                            <Route path="/play/:tokenId" element={
                                <GameContainer />
                            } />
                            <Route path="*" element={
                                <div className="bg-surface rounded-3xl p-4 md:p-12 border border-border text-center h-full flex items-center justify-center min-h-[600px]">
                                    <div className="items-center flex flex-col">
                                        <SporeLogo size={60} />
                                        <p className="text-textSecondary text-lg">Select a mushroom from your colony to start playing</p>
                                    </div>
                                </div>
                            } />
                        </Routes>
                    </div>
                )}
            </div>

            {/* Mint Interface */}
            <div className='mt-4'>
                <MintInterface onMint={handleMint} isLoading={isLoading} />
            </div>

            {/* Reveal Modal */}
            <NewMushroomReveal
                isOpen={revealOpen}
                onClose={() => {
                    setRevealOpen(false);
                    if (newMushroomId) {
                        navigate(`/play/${newMushroomId}`);
                        window.scrollTo(0, 0);
                    }
                    triggerRefresh()
                }}
                childId={newMushroomId}
                childTraits={newMushroomTraits}
            />

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="bg-surface rounded-2xl p-6 border border-border">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                        <Sprout size={24} className="text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text mb-2">Evolve Traits</h3>
                    <p className="text-sm text-textSecondary">
                        Spin to mutate your mushroom's cap, stem, and spores. Genetics determine your base stats.
                    </p>
                </div>

                <div className="bg-surface rounded-2xl p-6 border border-border">
                    <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mb-4">
                        <Sprout size={24} className="text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-text mb-2">The Canopy</h3>
                    <p className="text-sm text-textSecondary">
                        Dynamic yield based on ecosystem balance. Avoid the Shadow Zone by breeding rare traits.
                    </p>
                </div>

                <div className="bg-surface rounded-2xl p-6 border border-border">
                    <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center mb-4">
                        <Sprout size={24} className="text-warning" />
                    </div>
                    <h3 className="text-lg font-semibold text-text mb-2">Prestige System</h3>
                    <p className="text-sm text-textSecondary">
                        Reach max volatile stats to ascend. Unlock permanent perks and reward multipliers.
                    </p>
                </div>
            </div>
        </>
    );
};

export default GameDashboard;