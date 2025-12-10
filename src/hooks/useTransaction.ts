import { useState, useCallback } from "react";
import { MsgBroadcaster } from "@injectivelabs/wallet-core";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { NETWORK_CONFIG } from "../config";
import { showTransactionToast } from "../utils/toast";
import { useWalletStore } from "../store/walletStore"; // The store we made in the previous step
import { walletStrategy } from "../components/Wallet/WalletConnect"; // Import your strategy instance
import { useGameStore } from "../store/gameStore";

export const useTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { connectedWallet } = useWalletStore();
    const { triggerRefresh } = useGameStore();

    const executeTransaction = useCallback(
        async (msg: any, actionType: string = "transaction") => {
            if (!connectedWallet) {
                showTransactionToast.error("Please connect your wallet first.");
                return null;
            }

            setIsLoading(true);
            const toastId = showTransactionToast.loading(
                actionType === "spin"
                    ? "Spinning the wheel..."
                    : actionType === "harvest"
                    ? "Harvesting rewards..."
                    : actionType === "ascend"
                    ? "Attempting ascension..."
                    : actionType === "mint"
                    ? "Minting mushroom..."
                    : actionType === "breed"
                    ? "Splicing genetics..."
                    : "Processing transaction..."
            );

            try {
                const network =
                    NETWORK_CONFIG.network === "mainnet"
                        ? Network.Mainnet
                        : Network.Testnet;
                const endpoints = getNetworkEndpoints(network);

                console.log(network, endpoints);

                const broadcaster = new MsgBroadcaster({
                    walletStrategy: walletStrategy,
                    network,
                    endpoints,
                    simulateTx: true,
                    gasBufferCoefficient: 1.2,
                });

                const result = await broadcaster.broadcastV2({
                    msgs: msg,
                    injectiveAddress: connectedWallet,
                });

                showTransactionToast.dismiss(toastId);
                showTransactionToast.success(
                    result.txHash,
                    actionType === "spin"
                        ? "Spin successful!"
                        : actionType === "harvest"
                        ? "Rewards harvested!"
                        : actionType === "ascend"
                        ? "Ascension complete!"
                        : actionType === "mint"
                        ? "Mushroom minted!"
                        : actionType === "breed"
                        ? "New spore created!"
                        : "Transaction successful!"
                );

                // Wait for Indexer
                await new Promise((resolve) => setTimeout(resolve, 3000));

                // Trigger Global Refresh
                triggerRefresh();

                return result;
            } catch (e: any) {
                console.error("Transaction Failed:", e);
                showTransactionToast.dismiss(toastId);

                // Better error parsing can go here
                const errorMessage =
                    e?.originalMessage || e?.message || "Transaction failed";
                showTransactionToast.error(errorMessage);

                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [connectedWallet, triggerRefresh]
    );

    return { executeTransaction, isLoading };
};
