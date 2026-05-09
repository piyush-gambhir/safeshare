import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        electron([
            {
                // Main process entry file
                entry: "electron/main.ts",
                vite: {
                    build: {
                        outDir: "dist-electron",
                        rollupOptions: {
                            external: ["electron", "webtorrent"],
                        },
                    },
                },
            },
            {
                // Preload script entry file
                entry: "electron/preload.ts",
                onstart(options) {
                    // Notify the Renderer process to reload the page when the Preload scripts build is complete
                    options.reload();
                },
                vite: {
                    build: {
                        outDir: "dist-electron",
                    },
                },
            },
        ]),
        renderer({
            nodeIntegration: true,
        }),
    ],
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    build: {
        outDir: "dist",
        target: "esnext",
    },
});
