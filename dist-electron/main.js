import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import WebTorrent from "webtorrent";
const require2 = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const ELECTRON_START_URL = process.env.ELECTRON_START_URL;
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
let win;
const client = new WebTorrent();
if (require2("electron-squirrel-startup")) {
  app.quit();
}
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
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
  } catch (error) {
    console.error("Error initializing WebTorrent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
});
ipcMain.handle("seed-file", async (_event, filePath) => {
  try {
    const torrent = await new Promise((resolve) => {
      client.seed(filePath, (torrent2) => {
        resolve(torrent2);
      });
    });
    return { success: true, magnetURI: torrent.magnetURI };
  } catch (error) {
    console.error("Error seeding file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
});
ipcMain.handle("download-file", async (_event, magnetURI) => {
  try {
    const torrent = await new Promise((resolve) => {
      client.add(magnetURI, (torrent2) => {
        resolve(torrent2);
      });
    });
    return { success: true, torrent };
  } catch (error) {
    console.error("Error downloading file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
});
ipcMain.handle("get-downloads-path", async () => {
  try {
    const downloadsPath = app.getPath("downloads");
    return { success: true, path: downloadsPath };
  } catch (error) {
    console.error("Error getting downloads path:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
});
export {
  RENDERER_DIST
};
