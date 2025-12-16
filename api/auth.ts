import "dotenv/config";

import jwt from "jsonwebtoken";
import { verifyADR36Amino } from "@keplr-wallet/cosmos";

const JWT_SECRET = process.env.JWT_SECRET!;

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { signature, message, address, pubKey } = req.body;

    if (!signature || !message || !address || !pubKey) {
        return res.status(400).json({ error: "Missing auth details" });
    }

    try {
        const signatureBytes = new Uint8Array(Buffer.from(signature, "base64"));
        const pubKeyBytes = new Uint8Array(Buffer.from(pubKey.value, "base64"));

        const isValid = verifyADR36Amino(
            "inj", // bech32 prefix for Injective
            address, // signer address
            message, // raw text data
            pubKeyBytes, // public key bytes
            signatureBytes, // signature bytes
            "ethsecp256k1"
        );

        if (!isValid) {
            return res.status(401).json({ error: "Invalid Signature" });
        }

        const token = jwt.sign({ address }, JWT_SECRET, { expiresIn: "24h" });

        return res.status(200).json({ token });
    } catch (e) {
        console.error("Auth Error:", e);
        return res.status(500).json({ error: "Authentication failed" });
    }
}
