import { useState, useCallback } from "react";
import { MsgBroadcaster } from "@injectivelabs/wallet-core";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { NETWORK_CONFIG } from "../config";
import { showTransactionToast } from "../utils/toast";
import { useWalletStore } from "../store/walletStore";
import { walletStrategy } from "../components/Wallet/WalletConnect";
import { useGameStore } from "../store/gameStore";

export const useTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);

    const { connectedWallet, isAutoSignEnabled, setAutoSignEnabled } =
        useWalletStore();
    const { triggerRefresh } = useGameStore();

    const executeTransaction = useCallback(
        async (
            msg: any | any[],
            actionType: string = "transaction",
            forceManual: boolean = false
        ) => {
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
                let txHash = "";
                let result = null;

                // --- BRANCH 1: AUTO-SIGN (Via API) ---
                if (isAutoSignEnabled && !forceManual) {
                    const msgsArray = Array.isArray(msg) ? msg : [msg];
                    const jsonMsgs = msgsArray.map((m: any) => ({
                        contractAddress: m.params.contractAddress,
                        msg: m.params.msg,
                        sender: m.params.sender,
                        funds: m.params.funds,
                    }));

                    const response = await fetch("/api/auto-sign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            msgs: jsonMsgs, // Sends clean JSON objects
                            network: NETWORK_CONFIG.network,
                        }),
                    });

                    const data = await response.json();

                    if (
                        !response.ok &&
                        data.error.includes("failed to get grant")
                    ) {
                        console.log("no grant");
                        setAutoSignEnabled(false);
                        throw new Error("Auto-sign grant expired");
                    }
                    if (!response.ok) {
                        throw new Error(
                            data.error || "Auto-sign request failed"
                        );
                    }

                    txHash = data.txHash;
                    result = data; // Normalize result structure if needed
                }

                // --- BRANCH 2: MANUAL SIGN (Client Side) ---
                else {
                    const network =
                        NETWORK_CONFIG.network === "mainnet"
                            ? Network.Mainnet
                            : Network.Testnet;
                    const endpoints = getNetworkEndpoints(network);

                    const broadcaster = new MsgBroadcaster({
                        walletStrategy: walletStrategy,
                        network,
                        endpoints,
                        simulateTx: true,
                        gasBufferCoefficient: 1.2,
                    });

                    // Standard broadcast
                    const response = await broadcaster.broadcastV2({
                        msgs: msg,
                        injectiveAddress: connectedWallet,
                    });

                    txHash = response.txHash;
                    result = response;
                }

                // 3. Success Handling (Preserved Logic)
                showTransactionToast.dismiss(toastId);
                showTransactionToast.success(
                    txHash,
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
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Trigger Global Refresh
                triggerRefresh();

                return result;
            } catch (e: any) {
                console.error("Transaction Failed:", e);
                showTransactionToast.dismiss(toastId);

                // Error parsing
                const errorMessage =
                    e?.originalMessage || e?.message || "Transaction failed";
                showTransactionToast.error(errorMessage);

                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [connectedWallet, isAutoSignEnabled, triggerRefresh, setAutoSignEnabled]
    );

    return { executeTransaction, isLoading };
};
