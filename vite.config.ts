import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills"; // Import this
import vercelApi from "vite-plugin-vercel-api"; // Import the plugin

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            protocolImports: true,
        }),
        vercelApi(),
    ],
    optimizeDeps: {
        exclude: ["lucide-react"],
    },
});
