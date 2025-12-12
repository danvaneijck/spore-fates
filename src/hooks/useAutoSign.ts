import { useState } from "react";
import { MsgGrantWithAuthorization, MsgRevoke } from "@injectivelabs/sdk-ts";
import { CosmwasmWasmV1Authz } from "@injectivelabs/core-proto-ts";
import { useWalletStore } from "../store/walletStore";
import { useTransaction } from "./useTransaction";
import { showTransactionToast } from "../utils/toast";
import { NETWORK_CONFIG } from "../config";

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
    const { connectedWallet, isAutoSignEnabled, setAutoSignEnabled } =
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

            if (!isAutoSignEnabled) {
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
                        expiration: Math.floor(Date.now() / 1000) + 15 * 60,
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
                setAutoSignEnabled(newState);
            } else if (newState == false) {
                setAutoSignEnabled(newState);
            }

            if (result) {
                showTransactionToast.dismiss(toastId);
                showTransactionToast.success(
                    result.txHash,
                    newState ? "Auto-Sign Enabled!" : "Auto-Sign Disabled"
                );
            } else {
                showTransactionToast.dismiss(toastId);
            }
        } catch (e: any) {
            console.error("Auto Sign Toggle Failed", e);
            showTransactionToast.dismiss(toastId);
            showTransactionToast.error("Failed to update Auto-Sign settings");
        } finally {
            setIsToggling(false);
        }
    };

    return { toggleAutoSign, isToggling };
};
