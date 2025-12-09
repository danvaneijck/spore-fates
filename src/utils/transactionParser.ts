interface WasmAttribute {
    key: string;
    value: string;
    index: boolean;
}

interface WasmEvent {
    type: string;
    attributes: WasmAttribute[];
}

interface LogEvent {
    msg_index: string;
    events: WasmEvent[];
}

interface TransactionResponse {
    hash: string;
    logs: LogEvent[];
}

export interface SpinResult {
    success: boolean;
    tokenId: string;
    traitTarget: "cap" | "stem" | "spores";
    oldValue: number;
    newValue: number;
}

export function parseSpinResult(
    txResponse: TransactionResponse
): SpinResult | null {
    try {
        // Find the wasm event with spin data
        const wasmEvent = txResponse.events.find(
            (event) =>
                event.type === "wasm" &&
                event.attributes.some(
                    (attr) => attr.key === "action" && attr.value === "spin"
                )
        );

        if (!wasmEvent) {
            console.error("No spin wasm event found");
            return null;
        }

        // Extract attributes
        const getAttr = (key: string): string | undefined => {
            return wasmEvent.attributes.find((attr) => attr.key === key)?.value;
        };

        const success = getAttr("success") === "true";
        const tokenId = getAttr("token_id") || "";
        const traitTarget = (getAttr("trait_target")?.toLowerCase() ||
            "cap") as "cap" | "stem" | "spores";
        const oldValue = parseInt(getAttr("old_volatile") || "0");
        const newValue = parseInt(getAttr("new_volatile") || "0");

        return {
            success,
            tokenId,
            traitTarget,
            oldValue,
            newValue,
        };
    } catch (error) {
        console.error("Error parsing spin result:", error);
        return null;
    }
}

export const findAttribute = (
    txResult: any,
    eventType: string,
    attrKey: string
): string | null => {
    try {
        const events = txResult.events;
        for (const event of events) {
            if (event.type === "wasm-" + eventType || event.type === "wasm") {
                const attr = event.attributes.find(
                    (a: any) => a.key === attrKey
                );
                if (attr) return attr.value;
            }
        }
    } catch (e) {
        console.error("Error parsing logs", e);
    }
    return null;
};
