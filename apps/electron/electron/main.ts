import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import WebTorrent from "webtorrent";
import { seedFile, downloadFile } from "./transfers";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));










process.env.APP_ROOT = path.join(__dirname, "..");


const ELECTRON_START_URL = process.env.ELECTRON_START_URL;
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

let win: BrowserWindow | null;


export const client = new WebTorrent(
    process.env.NODE_ENV === "test"
        ? {
              dht: false,
              tracker: false,
              lsd: false,
              utPex: false,
              natUpnp: false,
              natPmp: false,
              utp: false,
              webSeeds: false,
          }
        : {},
);
client.on("error", (error) => console.error("WebTorrent error:", error));


if (require("electron-squirrel-startup")) {
    app.quit();
}

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });


    win.webContents.on("did-finish-load", () => {
        win?.webContents.send(
            "main-process-message",
            new Date().toLocaleString(),
        );
    });


    if (process.env.NODE_ENV === "development") {
        win.webContents.openDevTools();
    }

    if (ELECTRON_START_URL) {
        win.loadURL(ELECTRON_START_URL);
    } else {
        win.loadFile(path.join(RENDERER_DIST, "index.html"));
    }
}




app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
        win = null;
    }
});

app.on("activate", () => {


    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {


        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});


ipcMain.handle("initialize-webtorrent", async () => {
    try {
        return { success: true };
    } catch (error: unknown) {
        console.error("Error initializing WebTorrent:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
});

ipcMain.handle("seed-file", (_event, filePath: string) =>
    seedFile(client, filePath),
);

ipcMain.handle(
    "download-file",
    (_event, magnetUri: string, downloadPath: string) =>
        downloadFile(client, magnetUri, downloadPath),
);

ipcMain.handle("get-downloads-path", async () => {
    try {
        const downloadsPath = app.getPath("downloads");
        return { success: true, path: downloadsPath };
    } catch (error: unknown) {
        console.error("Error getting downloads path:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
});
