export type TransferResult<T = object> =
    ({ success: true } & T) | { success: false; error: string };

export interface SeedResult {
    magnetUri: string;
    infoHash: string;
}

export interface DownloadResult {
    path: string;
}
