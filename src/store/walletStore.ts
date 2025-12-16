import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Wallet } from "@injectivelabs/wallet-base";

interface WalletStore {
    connectedWallet: string | null;
    selectedWalletType: Wallet | null;
    showWallets: boolean;
    isAutoSignEnabled: boolean; // NEW
    authToken: string | null;
    authExpiration: number;

    setConnectedWallet: (wallet: string | null) => void;
    setSelectedWalletType: (type: Wallet | null) => void;
    setShowWallets: (show: boolean) => void;
    setAutoSignSession: (
        enabled: boolean,
        token?: string | null,
        expiration?: number
    ) => void;
    disconnect: () => void;
}

export const useWalletStore = create<WalletStore>()(
    persist(
        (set) => ({
            connectedWallet: null,
            selectedWalletType: null,
            showWallets: false,
            isAutoSignEnabled: false, // Default to false
            authToken: null,
            authExpiration: 0,

            setConnectedWallet: (wallet) => set({ connectedWallet: wallet }),
            setSelectedWalletType: (type) => set({ selectedWalletType: type }),
            setShowWallets: (show) => set({ showWallets: show }),

            setAutoSignSession: (enabled, token = null, expiration = 0) =>
                set({
                    isAutoSignEnabled: enabled,
                    authToken: token,
                    authExpiration: expiration,
                }),

            disconnect: () => {
                set({
                    connectedWallet: null,
                    selectedWalletType: null,
                    isAutoSignEnabled: false,
                    authToken: null,
                    authExpiration: 0,
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
                isAutoSignEnabled: state.isAutoSignEnabled,
                authToken: state.authToken,
                authExpiration: state.authExpiration,
            }),
        }
    )
);
