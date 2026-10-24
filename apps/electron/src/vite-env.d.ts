/// <reference types="vite/client" />

interface Window {
  electron: {
    initializeWebtorrent: () => Promise<void>;
    seedFile: (
      filePath: string,
    ) => Promise<{ magnetUri: string; infoHash: string }>;
    downloadFile: (
      magnetUri: string,
      downloadPath: string,
    ) => Promise<{ success: boolean; path?: string }>;
    getDownloadsPath: () => Promise<string>;
  };
}
