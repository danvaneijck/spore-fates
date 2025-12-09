import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, CheckCircle } from 'lucide-react';
import { shroomService } from '../services/shroomService';

interface Props {
    address: string;
    currentTokenId: string;
    refreshTrigger: number;
}

export const MushroomGallery: React.FC<Props> = ({ address, currentTokenId, refreshTrigger }) => {
    const [tokens, setTokens] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!address) return;

        const fetchTokens = async () => {
            setIsLoading(true);
            const list = await shroomService.getTokensOwned(address);
            setTokens(list);

            if (list.length > 0 && !currentTokenId) {
                navigate(`/play/${list[0]}`);
            }
            setIsLoading(false);
        };

        fetchTokens();
    }, [address, refreshTrigger, navigate, currentTokenId]);

    const handleSelect = (id: string) => {
        navigate(`/play/${id}`);
    };

    if (!address) return null;

    return (
        <div className="m-auto max-w-sm bg-surface/50 border border-border rounded-xl p-4 h-fit mb-5">
            <h3 className="text-text font-bold mb-4 flex items-center gap-2">
                <Sprout size={18} />
                Your Colony ({tokens.length})
            </h3>

            {isLoading && !tokens ? (
                <div className="text-textSecondary text-sm">Loading spores...</div>
            ) : tokens.length === 0 ? (
                <div className="text-textSecondary text-sm italic">
                    No mushrooms found. Mint one to start!
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {tokens.map((id) => (
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
        </div>
    );
};
