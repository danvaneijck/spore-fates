import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Wallet } from "@injectivelabs/wallet-base";

interface WalletStore {
    connectedWallet: string | null;
    selectedWalletType: Wallet | null;
    showWallets: boolean;
    isAutoSignEnabled: boolean; // NEW

    setConnectedWallet: (wallet: string | null) => void;
    setSelectedWalletType: (type: Wallet | null) => void;
    setShowWallets: (show: boolean) => void;
    setAutoSignEnabled: (enabled: boolean) => void; // NEW
    disconnect: () => void;
}

export const useWalletStore = create<WalletStore>()(
    persist(
        (set) => ({
            connectedWallet: null,
            selectedWalletType: null,
            showWallets: false,
            isAutoSignEnabled: false, // Default to false

            setConnectedWallet: (wallet) => set({ connectedWallet: wallet }),
            setSelectedWalletType: (type) => set({ selectedWalletType: type }),
            setShowWallets: (show) => set({ showWallets: show }),
            setAutoSignEnabled: (enabled) =>
                set({ isAutoSignEnabled: enabled }), // NEW
            disconnect: () => {
                set({
                    connectedWallet: null,
                    selectedWalletType: null,
                    isAutoSignEnabled: false, // Reset on disconnect
                });
                localStorage.removeItem("wallet-storage");
            },
        }),
        {
            name: "spore-wallet-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                connectedWallet: state.connectedWallet,
                selectedWalletType: state.selectedWalletType,
                isAutoSignEnabled: state.isAutoSignEnabled, // Persist this preference
            }),
        }
    )
);
