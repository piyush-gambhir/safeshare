import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electron", {
  initializeWebtorrent: () => ipcRenderer.invoke("initializeWebtorrent"),
  seedFile: (filePath) => ipcRenderer.invoke("seedFile", filePath),
  downloadFile: (magnetUri, downloadPath) => ipcRenderer.invoke("downloadFile", magnetUri, downloadPath),
  getDownloadsPath: () => ipcRenderer.invoke("getDownloadsPath")
});
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return ipcRenderer.on(
      channel,
      (event, ...args2) => listener(event, ...args2)
    );
  },
  off(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
