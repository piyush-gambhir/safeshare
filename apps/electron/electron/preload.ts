import { contextBridge, ipcRenderer, webUtils } from "electron";



contextBridge.exposeInMainWorld("electron", {
    initializeWebtorrent: () => ipcRenderer.invoke("initialize-webtorrent"),
    seedFile: (file: File) =>
        ipcRenderer.invoke("seed-file", webUtils.getPathForFile(file)),
    downloadFile: (magnetUri: string, downloadPath: string) =>
        ipcRenderer.invoke("download-file", magnetUri, downloadPath),
    getDownloadsPath: () => ipcRenderer.invoke("get-downloads-path"),
});


contextBridge.exposeInMainWorld("ipcRenderer", {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args;
        return ipcRenderer.on(channel, (event, ...args) =>
            listener(event, ...args),
        );
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, ...omit] = args;
        return ipcRenderer.off(channel, ...omit);
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args;
        return ipcRenderer.send(channel, ...omit);
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args;
        return ipcRenderer.invoke(channel, ...omit);
    },



});
