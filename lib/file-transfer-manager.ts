import WebTorrent from 'webtorrent';

import type { FileMetadata } from './api-service';

export type TransferState =
    | 'idle'
    | 'initiated'
    | 'ready'
    | 'connected'
    | 'transferring'
    | 'completed'
    | 'error';

export interface TransferProgress {
    bytesTransferred: number;
    totalBytes: number;
    speed: number; // bytes per second
}

export interface TransferError {
    code: string;
    message: string;
}

export interface TorrentInfo {
    infoHash: string;
    magnetUri: string;
}

export class FileTransferManager {
    private client: WebTorrent.Instance;
    private file: File | null = null;
    private state: TransferState = 'idle';
    private progress: TransferProgress | null = null;
    private stateChangeCallback: ((state: TransferState) => void) | null = null;
    private progressCallback: ((progress: TransferProgress) => void) | null =
        null;
    private errorCallback: ((error: TransferError) => void) | null = null;
    private fileReceivedCallback: ((file: File) => void) | null = null;
    private torrentInfo: TorrentInfo | null = null;

    constructor() {
        this.client = new WebTorrent();
        this.setupWebTorrentCallbacks();
    }

    private setupWebTorrentCallbacks(): void {
        this.client.on('error', (err: string | Error) => {
            this.handleError({
                code: 'webtorrent_error',
                message: err instanceof Error ? err.message : err,
            });
        });
    }

    async initiateSend(file: File, publicKey: string): Promise<void> {
        this.file = file;
        this.setState('initiated');

        try {
            const torrent = await new Promise<WebTorrent.Torrent>(
                (resolve, reject) => {
                    this.client.seed(
                        file,
                        { announceList: [] },
                        (torrent: WebTorrent.Torrent) => {
                            resolve(torrent);
                        },
                    );
                },
            );

            this.torrentInfo = {
                infoHash: torrent.infoHash,
                magnetUri: torrent.magnetURI,
            };

            torrent.on('upload', (bytes: number) => {
                this.updateProgress({
                    bytesTransferred: bytes,
                    totalBytes: file.size,
                    speed: torrent.uploadSpeed,
                });
            });

            torrent.on('done', () => {
                this.setState('completed');
            });

            this.setState('transferring');
        } catch (error) {
            this.handleError({
                code: 'seed_error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to seed file',
            });
        }
    }

    async initiateReceive(
        publicKey: string,
        magnetUri: string,
        fileMetadata: FileMetadata,
    ): Promise<void> {
        this.setState('ready');

        try {
            const torrent = await new Promise<WebTorrent.Torrent>(
                (resolve, reject) => {
                    this.client.add(
                        magnetUri,
                        (torrent: WebTorrent.Torrent) => {
                            resolve(torrent);
                        },
                    );
                },
            );

            torrent.on('download', (bytes: number) => {
                this.updateProgress({
                    bytesTransferred: bytes,
                    totalBytes: fileMetadata.size,
                    speed: torrent.downloadSpeed,
                });
            });

            torrent.on('done', () => {
                const torrentFile = torrent.files[0];
                if (this.fileReceivedCallback && torrentFile) {
                    torrentFile.getBlob(
                        (err: string | Error | undefined, blob?: Blob) => {
                            if (err) {
                                this.handleError({
                                    code: 'file_conversion_error',
                                    message:
                                        err instanceof Error
                                            ? err.message
                                            : err,
                                });
                                return;
                            }
                            if (!blob) {
                                this.handleError({
                                    code: 'file_conversion_error',
                                    message:
                                        'Failed to convert torrent file to blob',
                                });
                                return;
                            }
                            const file = new File([blob], torrentFile.name, {
                                type: blob.type,
                                lastModified: Date.now(),
                            });
                            if (this.fileReceivedCallback) {
                                this.fileReceivedCallback(file);
                            }
                        },
                    );
                }
                this.setState('completed');
            });

            this.setState('transferring');
        } catch (error) {
            this.handleError({
                code: 'download_error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to download file',
            });
        }
    }

    getTorrentInfo(): TorrentInfo | null {
        return this.torrentInfo;
    }

    onStateChange(callback: (state: TransferState) => void): void {
        this.stateChangeCallback = callback;
    }

    onProgress(callback: (progress: TransferProgress) => void): void {
        this.progressCallback = callback;
    }

    onError(callback: (error: TransferError) => void): void {
        this.errorCallback = callback;
    }

    onFileReceived(callback: (file: File) => void): void {
        this.fileReceivedCallback = callback;
    }

    private setState(state: TransferState): void {
        this.state = state;
        if (this.stateChangeCallback) {
            this.stateChangeCallback(state);
        }
    }

    private updateProgress(progress: TransferProgress): void {
        this.progress = progress;
        if (this.progressCallback) {
            this.progressCallback(progress);
        }
    }

    private handleError(error: TransferError): void {
        if (this.errorCallback) {
            this.errorCallback(error);
        }
        this.setState('error');
    }

    cancel(): void {
        this.client.destroy();
        this.setState('idle');
        this.file = null;
        this.progress = null;
        this.torrentInfo = null;
    }
}
