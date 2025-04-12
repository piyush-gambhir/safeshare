import { EncryptionService } from './encryption-service';
import { FileChunker, type FileMetadata } from './file-chunker';
import { type SignalData, WebRTCService } from './webrtc-service';

export type TransferRole = 'sender' | 'receiver';

export type TransferState =
    | 'idle'
    | 'preparing'
    | 'connecting'
    | 'transferring'
    | 'paused'
    | 'completed'
    | 'error';

export interface TransferProgress {
    bytesTransferred: number;
    totalBytes: number;
    chunksTransferred: number;
    totalChunks: number;
    percentage: number;
    speed: number; // bytes per second
}

export interface TransferError {
    code: string;
    message: string;
}

export class FileTransferManager {
    private webrtcService: WebRTCService;
    private encryptionService: EncryptionService;
    private fileChunker: FileChunker;

    private role: TransferRole = 'sender';
    private state: TransferState = 'idle';
    private error: TransferError | null = null;

    private file: File | null = null;
    private receivedChunks: Map<number, ArrayBuffer> = new Map();
    private receivedMetadata: FileMetadata | null = null;

    private transferStartTime = 0;
    private bytesTransferred = 0;
    private chunksTransferred = 0;

    private onStateChangeCallback: ((state: TransferState) => void) | null =
        null;
    private onProgressCallback: ((progress: TransferProgress) => void) | null =
        null;
    private onErrorCallback: ((error: TransferError) => void) | null = null;
    private onFileReceivedCallback: ((file: File) => void) | null = null;
    private onSignalCallback: ((signal: SignalData) => void) | null = null;

    constructor() {
        this.webrtcService = new WebRTCService();
        this.encryptionService = new EncryptionService();
        this.fileChunker = new FileChunker();

        this.setupWebRTCListeners();
    }

    private setupWebRTCListeners() {
        this.webrtcService.onConnectionStateChange((state) => {
            if (state === 'connected') {
                if (this.role === 'sender' && this.state === 'connecting') {
                    this.setState('preparing');
                    this.prepareTransfer();
                }
            } else if (
                state === 'disconnected' ||
                state === 'failed' ||
                state === 'closed'
            ) {
                if (
                    this.state === 'transferring' ||
                    this.state === 'connecting'
                ) {
                    this.setError('connection', 'Connection to peer lost');
                }
            }
        });

        this.webrtcService.onDataChannelStateChange((state) => {
            if (
                state === 'open' &&
                this.role === 'sender' &&
                this.state === 'preparing'
            ) {
                this.startTransfer();
            }
        });

        this.webrtcService.onDataReceived((data) => {
            this.handleReceivedData(data);
        });

        this.webrtcService.onSignal((signal) => {
            if (this.onSignalCallback) {
                this.onSignalCallback(signal);
            }
        });
    }

    public async initiateSend(file: File): Promise<void> {
        if (this.state !== 'idle') {
            throw new Error('Transfer already in progress');
        }

        this.role = 'sender';
        this.file = file;
        this.fileChunker.setFile(file);

        this.setState('preparing');

        try {
            await this.encryptionService.generateKey();
            this.setState('connecting');
            await this.webrtcService.createOffer();
        } catch (error) {
            this.setError(
                'initialization',
                `Failed to initiate send: ${error}`,
            );
        }
    }

    public initiateReceive(): Promise<void> {
        if (this.state !== 'idle') {
            throw new Error('Transfer already in progress');
        }

        this.role = 'receiver';
        this.setState('connecting');

        return Promise.resolve();
    }

    public async handleSignal(signal: SignalData): Promise<void> {
        try {
            await this.webrtcService.handleSignal(signal);
        } catch (error) {
            this.setError('signaling', `Failed to handle signal: ${error}`);
        }
    }

    private async prepareTransfer(): Promise<void> {
        if (this.role === 'sender' && this.file) {
            try {
                const keyData = await this.encryptionService.exportKey();
                const metadata = this.fileChunker.getMetadata();

                if (!metadata) {
                    throw new Error('File metadata not available');
                }

                // Send encryption key and file metadata
                const setupData = {
                    type: 'setup',
                    key: keyData,
                    metadata,
                };

                const setupDataString = JSON.stringify(setupData);
                const setupDataBuffer = new TextEncoder().encode(
                    setupDataString,
                ).buffer;

                this.webrtcService.sendData(setupDataBuffer);
                this.startTransfer();
            } catch (error) {
                this.setError(
                    'preparation',
                    `Failed to prepare transfer: ${error}`,
                );
            }
        }
    }

    private async startTransfer(): Promise<void> {
        if (this.role === 'sender' && this.file) {
            this.setState('transferring');
            this.transferStartTime = Date.now();
            this.sendNextChunk(0);
        }
    }

    private async sendNextChunk(chunkId: number): Promise<void> {
        if (this.state !== 'transferring' || !this.file) {
            return;
        }

        const metadata = this.fileChunker.getMetadata();
        if (!metadata || chunkId >= metadata.totalChunks) {
            this.completeTransfer();
            return;
        }

        try {
            const chunk = await this.fileChunker.getChunk(chunkId);

            if (!chunk) {
                throw new Error(`Failed to get chunk ${chunkId}`);
            }

            // Encrypt the chunk
            const encryptedData = await this.encryptionService.encrypt(
                chunk.data,
            );

            // Prepare chunk header
            const header = {
                type: 'chunk',
                id: chunk.id,
                size: chunk.size,
            };

            const headerString = JSON.stringify(header);
            const headerBuffer = new TextEncoder().encode(headerString).buffer;

            // Create a buffer with header size (4 bytes) + header + encrypted data
            const headerSize = new Uint32Array([headerBuffer.byteLength]);
            const headerSizeBuffer = headerSize.buffer;

            const combinedBuffer = new Uint8Array(
                headerSizeBuffer.byteLength +
                    headerBuffer.byteLength +
                    encryptedData.byteLength,
            );
            combinedBuffer.set(new Uint8Array(headerSizeBuffer), 0);
            combinedBuffer.set(
                new Uint8Array(headerBuffer),
                headerSizeBuffer.byteLength,
            );
            combinedBuffer.set(
                new Uint8Array(encryptedData),
                headerSizeBuffer.byteLength + headerBuffer.byteLength,
            );

            // Send the combined buffer
            const success = this.webrtcService.sendData(combinedBuffer.buffer);

            if (success) {
                this.bytesTransferred += chunk.size;
                this.chunksTransferred++;

                this.updateProgress();

                // Send the next chunk
                this.sendNextChunk(chunkId + 1);
            } else {
                // Retry sending the same chunk after a short delay
                setTimeout(() => {
                    this.sendNextChunk(chunkId);
                }, 1000);
            }
        } catch (error) {
            this.setError(
                'transfer',
                `Failed to send chunk ${chunkId}: ${error}`,
            );
        }
    }

    private async handleReceivedData(data: ArrayBuffer): Promise<void> {
        try {
            // First 4 bytes contain the header size
            const headerSizeView = new DataView(data, 0, 4);
            const headerSize = headerSizeView.getUint32(0, true);

            // Extract the header
            const headerBuffer = data.slice(4, 4 + headerSize);
            const headerString = new TextDecoder().decode(headerBuffer);
            const header = JSON.parse(headerString);

            if (header.type === 'setup') {
                // Handle setup data (encryption key and file metadata)
                await this.encryptionService.importKey(header.key);
                this.receivedMetadata = header.metadata;

                this.setState('transferring');
                this.transferStartTime = Date.now();
                this.updateProgress();
            } else if (header.type === 'chunk') {
                // Handle file chunk
                const encryptedChunkData = data.slice(4 + headerSize);
                const chunkData =
                    await this.encryptionService.decrypt(encryptedChunkData);

                this.receivedChunks.set(header.id, chunkData);
                this.bytesTransferred += header.size;
                this.chunksTransferred++;

                this.updateProgress();

                // Check if all chunks have been received
                if (
                    this.receivedMetadata &&
                    this.chunksTransferred >= this.receivedMetadata.totalChunks
                ) {
                    this.assembleReceivedFile();
                }
            }
        } catch (error) {
            this.setError(
                'receive',
                `Failed to process received data: ${error}`,
            );
        }
    }

    private assembleReceivedFile(): void {
        if (!this.receivedMetadata) {
            this.setError('assembly', 'No file metadata available');
            return;
        }

        try {
            // Sort chunks by ID
            const sortedChunks: ArrayBuffer[] = [];
            for (let i = 0; i < this.receivedMetadata.totalChunks; i++) {
                const chunk = this.receivedChunks.get(i);
                if (!chunk) {
                    throw new Error(`Missing chunk ${i}`);
                }
                sortedChunks.push(chunk);
            }

            // Combine all chunks
            const totalSize = sortedChunks.reduce(
                (size, chunk) => size + chunk.byteLength,
                0,
            );
            const fileData = new Uint8Array(totalSize);

            let offset = 0;
            for (const chunk of sortedChunks) {
                fileData.set(new Uint8Array(chunk), offset);
                offset += chunk.byteLength;
            }

            // Create a new File object
            const receivedFile = new File(
                [fileData],
                this.receivedMetadata.name,
                { type: this.receivedMetadata.type },
            );

            if (this.onFileReceivedCallback) {
                this.onFileReceivedCallback(receivedFile);
            }

            this.completeTransfer();
        } catch (error) {
            this.setError('assembly', `Failed to assemble file: ${error}`);
        }
    }

    private completeTransfer(): void {
        this.setState('completed');
    }

    private updateProgress(): void {
        if (!this.onProgressCallback) {
            return;
        }

        const totalBytes =
            this.role === 'sender'
                ? this.file?.size || 0
                : this.receivedMetadata?.size || 0;

        const totalChunks =
            this.role === 'sender'
                ? this.fileChunker.getMetadata()?.totalChunks || 0
                : this.receivedMetadata?.totalChunks || 0;

        const elapsedTime = (Date.now() - this.transferStartTime) / 1000;
        const speed = elapsedTime > 0 ? this.bytesTransferred / elapsedTime : 0;

        const progress: TransferProgress = {
            bytesTransferred: this.bytesTransferred,
            totalBytes,
            chunksTransferred: this.chunksTransferred,
            totalChunks,
            percentage:
                totalBytes > 0 ? (this.bytesTransferred / totalBytes) * 100 : 0,
            speed,
        };

        this.onProgressCallback(progress);
    }

    private setState(state: TransferState): void {
        this.state = state;

        if (this.onStateChangeCallback) {
            this.onStateChangeCallback(state);
        }
    }

    private setError(code: string, message: string): void {
        this.error = { code, message };
        this.setState('error');

        if (this.onErrorCallback) {
            this.onErrorCallback(this.error);
        }
    }

    public getState(): TransferState {
        return this.state;
    }

    public getError(): TransferError | null {
        return this.error;
    }

    public pause(): void {
        if (this.state === 'transferring') {
            this.setState('paused');
        }
    }

    public resume(): void {
        if (this.state === 'paused') {
            this.setState('transferring');

            if (this.role === 'sender') {
                this.sendNextChunk(this.chunksTransferred);
            }
        }
    }

    public cancel(): void {
        this.webrtcService.close();
        this.setState('idle');
        this.reset();
    }

    private reset(): void {
        this.file = null;
        this.receivedChunks = new Map();
        this.receivedMetadata = null;
        this.transferStartTime = 0;
        this.bytesTransferred = 0;
        this.chunksTransferred = 0;
        this.error = null;
    }

    public onStateChange(callback: (state: TransferState) => void): void {
        this.onStateChangeCallback = callback;
    }

    public onProgress(callback: (progress: TransferProgress) => void): void {
        this.onProgressCallback = callback;
    }

    public onError(callback: (error: TransferError) => void): void {
        this.onErrorCallback = callback;
    }

    public onFileReceived(callback: (file: File) => void): void {
        this.onFileReceivedCallback = callback;
    }

    public onSignal(callback: (signal: SignalData) => void): void {
        this.onSignalCallback = callback;
    }
}
