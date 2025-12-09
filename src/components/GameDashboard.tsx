import { Sprout } from "lucide-react";
import { MintInterface } from "./MintInterface";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import GameContainer from "./GameContainer";
import { MushroomGallery } from "./MushroomGallery";
import { WalletConnect } from "./WalletConnect";
import { shroomService, TraitExtension } from "../services/shroomService";
import { findAttribute } from "../utils/transactionParser";
import { useState } from "react";
import { NewMushroomReveal } from "./NewMushroomReveal";

const GalleryWrapper = ({ address, refreshTrigger }: { address: string, refreshTrigger: number }) => {
    // Extract tokenId from the URL (e.g., /play/123)
    const { tokenId } = useParams();

    return (
        <MushroomGallery
            address={address}
            // Pass the ID or empty string if on the root page
            currentTokenId={tokenId || ''}
            refreshTrigger={refreshTrigger}
        />
    );
};


const GameDashboard = ({ address, setAddress, refreshTrigger, setRefreshTrigger, executeTransaction, isLoading }) => {
    const navigate = useNavigate();

    const [revealOpen, setRevealOpen] = useState(false);
    const [newMushroomId, setNewMushroomId] = useState<string | null>(null);
    const [newMushroomTraits, setNewMushroomTraits] = useState<TraitExtension | null>(null);


    const handleMint = async (priceRaw: string) => {
        if (!address) return;
        const msg = shroomService.makeMintMsg(address, priceRaw);
        const result = await executeTransaction(msg, 'mint');

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
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-text mb-4">
                    Evolve Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Mushroom</span>
                </h2>
                <p className="text-lg text-textSecondary max-w-2xl mx-auto mb-8">
                    A strategy GameFi experience on Injective. Roll traits, harvest rewards, and ascend to prestige levels.
                </p>

                <div className="flex justify-center mb-4">
                    <WalletConnect onAddressChange={setAddress} />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
                {/* Left Column - Gallery */}
                {address && (
                    <div className="w-full lg:w-[320px]">
                        <Routes>
                            <Route
                                path="/play/:tokenId"
                                element={<GalleryWrapper address={address} refreshTrigger={refreshTrigger} />}
                            />
                            <Route
                                path="*"
                                element={<GalleryWrapper address={address} refreshTrigger={refreshTrigger} />}
                            />
                        </Routes>
                    </div>
                )}

                {/* Right Column - Game Interface */}
                {address && (
                    <div className="flex-1 min-h-[600px] mb-10">
                        <Routes>
                            <Route path="/play/:tokenId" element={
                                <GameContainer
                                    address={address}
                                    refreshTrigger={refreshTrigger}
                                    setRefreshTrigger={setRefreshTrigger}
                                    executeTransaction={executeTransaction}
                                    isLoading={isLoading}
                                />
                            } />
                            <Route path="*" element={
                                <div className="bg-surface rounded-3xl p-4 md:p-12 border border-border text-center h-full flex items-center justify-center min-h-[600px]">
                                    <div>
                                        <Sprout size={64} className="text-primary mx-auto mb-4 opacity-50" />
                                        <p className="text-textSecondary text-lg">Select a mushroom from your colony to start playing</p>
                                    </div>
                                </div>
                            } />
                        </Routes>
                    </div>
                )}
            </div>

            {/* Mint Interface */}
            <div className='mt-12'>
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
                    setRefreshTrigger(prev => prev + 1);
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