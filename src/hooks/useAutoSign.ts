import { useState } from "react";
import { MsgGrantWithAuthorization, MsgRevoke } from "@injectivelabs/sdk-ts";
import { CosmwasmWasmV1Authz } from "@injectivelabs/core-proto-ts";
import { useWalletStore } from "../store/walletStore";
import { useTransaction } from "./useTransaction";
import { showTransactionToast } from "../utils/toast";
import { NETWORK_CONFIG } from "../config";
import { walletStrategy } from "../components/Wallet/WalletConnect";

const DELEGATE_ADDRESS = import.meta.env.VITE_DELEGATE_ADDRESS;

class MultiContractAuthz {
    private payload: any;
    public params: any;

    constructor(payload: any) {
        this.payload = payload;
    }

    toAny() {
        const binary =
            CosmwasmWasmV1Authz.ContractExecutionAuthorization.encode(
                this.payload
            ).finish();

        return {
            typeUrl: "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
            value: binary,
        };
    }

    toProto() {
        return this.toAny();
    }
    toAmino() {
        return {};
    }
    toWeb3() {
        return {};
    }
}

export const useAutoSign = () => {
    const [isToggling, setIsToggling] = useState(false);
    const { connectedWallet, isAutoSignEnabled, setAutoSignSession } =
        useWalletStore();
    const { executeTransaction } = useTransaction();

    const toggleAutoSign = async () => {
        if (!connectedWallet) return;

        setIsToggling(true);
        const toastId = showTransactionToast.loading(
            isAutoSignEnabled
                ? "Disabling Auto-Sign..."
                : "Enabling Auto-Sign..."
        );

        try {
            const msgs = [];
            const expirationSeconds = 15 * 60;
            const expirationTimestamp =
                Math.floor(Date.now() / 1000) + expirationSeconds;
            const expirationMs = Date.now() + expirationSeconds * 1000;

            // --- ENABLING ---
            if (!isAutoSignEnabled) {
                const authMessage = `Authorize Auto-Sign for ${connectedWallet}\nValid until: ${expirationMs}`;

                // 1. Get Signature FIRST
                try {
                    if (walletStrategy.wallet == "keplr") {
                        const signature = await window.keplr.signArbitrary(
                            NETWORK_CONFIG.chainId,
                            connectedWallet,
                            authMessage
                        );

                        const loginRes = await fetch("/api/auth", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                address: connectedWallet,
                                message: authMessage,
                                signature: signature.signature,
                                pubKey: signature.pub_key,
                            }),
                        });
                        if (!loginRes.ok)
                            throw new Error("Server rejected signature");

                        const { token } = await loginRes.json();

                        setAutoSignSession(true, token, expirationMs);
                    } else {
                        throw new Error("Only Keplr supported");
                    }
                } catch (sigError) {
                    console.log(sigError);
                    showTransactionToast.dismiss(toastId);
                    showTransactionToast.error(
                        "Signature rejected. Auto-sign cancelled."
                    );
                    return; // Stop here if they don't sign
                }

                // 2. Set Session State IMMEDIATELY
                // We do this before the transaction so if it succeeds, the store is ready
                const gameLimitBinary =
                    CosmwasmWasmV1Authz.CombinedLimit.encode({
                        callsRemaining: "100000",
                        amounts: [
                            { denom: "inj", amount: "50000000000000000000" },
                        ],
                    }).finish();

                const oracleLimitBinary =
                    CosmwasmWasmV1Authz.CombinedLimit.encode({
                        callsRemaining: "100000",
                        amounts: [{ denom: "inj", amount: "1000" }],
                    }).finish();

                const gameFilterBinary =
                    CosmwasmWasmV1Authz.AcceptedMessageKeysFilter.encode({
                        keys: ["spin", "resolve_spin", "harvest"],
                    }).finish();

                const oracleFilterBinary =
                    CosmwasmWasmV1Authz.AcceptedMessageKeysFilter.encode({
                        keys: ["add_beacon"],
                    }).finish();

                const rawAuthPayload = {
                    grants: [
                        {
                            contract: NETWORK_CONFIG.gameControllerAddress,
                            limit: {
                                typeUrl: "/cosmwasm.wasm.v1.CombinedLimit",
                                value: gameLimitBinary,
                            },
                            filter: {
                                typeUrl:
                                    "/cosmwasm.wasm.v1.AcceptedMessageKeysFilter",
                                value: gameFilterBinary,
                            },
                        },
                        {
                            contract: NETWORK_CONFIG.oracleAddress,
                            limit: {
                                typeUrl: "/cosmwasm.wasm.v1.CombinedLimit",
                                value: oracleLimitBinary,
                            },
                            filter: {
                                typeUrl:
                                    "/cosmwasm.wasm.v1.AcceptedMessageKeysFilter",
                                value: oracleFilterBinary,
                            },
                        },
                    ],
                };

                const customAuth = new MultiContractAuthz(rawAuthPayload);

                msgs.push(
                    MsgGrantWithAuthorization.fromJSON({
                        granter: connectedWallet,
                        grantee: DELEGATE_ADDRESS,
                        expiration: expirationTimestamp,
                        authorization: customAuth,
                    })
                );
            } else {
                msgs.push(
                    MsgRevoke.fromJSON({
                        granter: connectedWallet,
                        grantee: DELEGATE_ADDRESS,
                        messageType: "/cosmwasm.wasm.v1.MsgExecuteContract",
                    })
                );
            }

            const result = await executeTransaction(msgs, "transaction", true);

            const newState = !isAutoSignEnabled;
            if (result && newState == true) {
                showTransactionToast.dismiss(toastId);
                showTransactionToast.success(
                    result.txHash,
                    "Auto-Sign Enabled!"
                );
            } else if (newState == false) {
                setAutoSignSession(false, null, 0);
                showTransactionToast.dismiss(toastId);
            }
        } catch (e: any) {
            console.error("Auto Sign Toggle Failed", e);
            showTransactionToast.dismiss(toastId);
            showTransactionToast.error("Failed to update Auto-Sign settings");
            if (!isAutoSignEnabled) setAutoSignSession(false, null, 0);
        } finally {
            setIsToggling(false);
        }
    };

    return { toggleAutoSign, isToggling };
};
