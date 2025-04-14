import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import WebTorrent from "webtorrent";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const ELECTRON_START_URL = process.env.ELECTRON_START_URL;
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

let win: BrowserWindow | null;

// Initialize WebTorrent client
const client = new WebTorrent();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
    app.quit();
}

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Test active push message to Renderer-process.
    win.webContents.on("did-finish-load", () => {
        win?.webContents.send(
            "main-process-message",
            new Date().toLocaleString()
        );
    });

    // Open the DevTools.
    if (process.env.NODE_ENV === "development") {
        win.webContents.openDevTools();
    }

    if (ELECTRON_START_URL) {
        win.loadURL(ELECTRON_START_URL);
    } else {
        win.loadFile(path.join(RENDERER_DIST, "index.html"));
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
        win = null;
    }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Handle IPC messages
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

ipcMain.handle("seed-file", async (_event, filePath: string) => {
    try {
        const torrent = await new Promise<WebTorrent.Torrent>((resolve) => {
            client.seed(filePath, (torrent) => {
                resolve(torrent);
            });
        });
        return { success: true, magnetURI: torrent.magnetURI };
    } catch (error: unknown) {
        console.error("Error seeding file:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
});

ipcMain.handle("download-file", async (_event, magnetURI: string) => {
    try {
        const torrent = await new Promise<WebTorrent.Torrent>((resolve) => {
            client.add(magnetURI, (torrent) => {
                resolve(torrent);
            });
        });
        return { success: true, torrent };
    } catch (error: unknown) {
        console.error("Error downloading file:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
});

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
