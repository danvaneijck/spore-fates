import "dotenv/config";
import {
    MsgAuthzExec,
    MsgBroadcasterWithPk,
    MsgExecuteContract,
    PrivateKey,
} from "@injectivelabs/sdk-ts";
import { Network, getNetworkEndpoints } from "@injectivelabs/networks";

const DELEGATE_SEED = process.env.DELEGATE_MNEMONIC;
const DELEGATE_ADDRESS = process.env.VITE_DELEGATE_ADDRESS;

export default async function handler(request, response) {
    if (request.method !== "POST") {
        return response.status(405).json({ error: "Method not allowed" });
    }

    if (!DELEGATE_SEED || !DELEGATE_ADDRESS) {
        return response
            .status(500)
            .json({ error: "Server misconfiguration: Missing keys" });
    }

    try {
        const { msgs, network: networkName } = request.body;

        const rehydratedMsgs = msgs.map((m: any) => {
            if (m.contractAddress && m.msg) {
                return MsgExecuteContract.fromJSON({
                    contractAddress: m.contractAddress,
                    sender: m.sender,
                    msg: m.msg,
                    funds: m.funds,
                });
            }
            return m;
        });

        const msgExec = MsgAuthzExec.fromJSON({
            grantee: DELEGATE_ADDRESS,
            msgs: rehydratedMsgs,
        });

        const network =
            networkName === "mainnet" ? Network.Mainnet : Network.Testnet;
        const endpoints = getNetworkEndpoints(network);

        const broadcaster = new MsgBroadcasterWithPk({
            privateKey: PrivateKey.fromMnemonic(DELEGATE_SEED),
            network,
            endpoints,
            simulateTx: true,
            gasBufferCoefficient: 1.1,
        });

        async function broadcastWithRetry(maxRetries = 5) {
            let attempt = 0;

            while (attempt <= maxRetries) {
                try {
                    return await broadcaster.broadcast({ msgs: msgExec });
                } catch (error) {
                    const message = error?.message || "";

                    const isSequenceError =
                        message.includes("incorrect account sequence") ||
                        message.includes("account sequence") ||
                        message.includes("signature verification failed");

                    if (!isSequenceError || attempt === maxRetries) {
                        throw error;
                    }

                    // Retry
                    attempt++;

                    // Small delay to avoid hammering
                    await new Promise((r) => setTimeout(r, 150 * attempt));
                }
            }
        }

        const txResponse = await broadcastWithRetry();
        return response.status(200).json(txResponse);
    } catch (error) {
        return response.status(500).json({
            error: error.message || "Transaction failed",
            details: error.originalMessage,
        });
    }
}
