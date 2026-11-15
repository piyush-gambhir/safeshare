import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import { resolve } from "path";


export default defineConfig({
    plugins: [
        react(),
        electron([
            {

                entry: "electron/main.ts",
                vite: {
                    build: {
                        outDir: "dist-electron",
                        rolldownOptions: {
                            external: ["electron", "webtorrent"],
                        },
                    },
                },
            },
            {

                entry: "electron/preload.ts",
                onstart(options) {

                    options.reload();
                },
                vite: {
                    build: {
                        outDir: "dist-electron",
                        lib: { entry: "electron/preload.ts", formats: ["cjs"] },
                        rolldownOptions: {
                            output: { entryFileNames: "preload.cjs" },
                        },
                    },
                },
            },
        ]),
        renderer({
            nodeIntegration: false,
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
