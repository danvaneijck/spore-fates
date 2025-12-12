import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import vercelApi from "vite-plugin-vercel-api";

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            protocolImports: true,
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
        vercelApi(),
    ],
    define: {
        global: "globalThis",
    },
    optimizeDeps: {
        exclude: ["lucide-react"],
    },
});
