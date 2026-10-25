/// <reference types="vite/client" />
import type {
    TransferResult,
    SeedResult,
    DownloadResult,
} from "./types/transfer";

declare global {
    interface Window {
        electron: {
            initializeWebtorrent: () => Promise<TransferResult>;
            seedFile: (file: File) => Promise<TransferResult<SeedResult>>;
            downloadFile: (
                magnetUri: string,
                downloadPath: string,
            ) => Promise<TransferResult<DownloadResult>>;
            getDownloadsPath: () => Promise<TransferResult<DownloadResult>>;
        };
    }
}
