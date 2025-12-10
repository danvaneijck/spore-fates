import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Wallet } from "@injectivelabs/wallet-base";

interface WalletStore {
    connectedWallet: string | null;
    selectedWalletType: Wallet | null;
    showWallets: boolean;

    setConnectedWallet: (wallet: string | null) => void;
    setSelectedWalletType: (type: Wallet | null) => void;
    setShowWallets: (show: boolean) => void;
    disconnect: () => void;
}

export const useWalletStore = create<WalletStore>()(
    persist(
        (set) => ({
            connectedWallet: null,
            selectedWalletType: null,
            showWallets: false,

            setConnectedWallet: (wallet) => set({ connectedWallet: wallet }),
            setSelectedWalletType: (type) => set({ selectedWalletType: type }),
            setShowWallets: (show) => set({ showWallets: show }),
            disconnect: () => {
                set({ connectedWallet: null, selectedWalletType: null });
                localStorage.removeItem("wallet-storage"); // Optional explicit clear
            },
        }),
        {
            name: "spore-wallet-storage", // unique name
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                connectedWallet: state.connectedWallet,
                selectedWalletType: state.selectedWalletType,
            }),
        }
    )
);
