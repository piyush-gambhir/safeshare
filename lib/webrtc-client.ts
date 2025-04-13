import type { FileMetadata } from './api-service';

export type TransferState =
    | 'idle'
    | 'connecting'
    | 'transferring'
    | 'completed'
    | 'error';

export interface TransferProgress {
    bytesTransferred: number;
    totalBytes: number;
    speed: number;
}

export interface TransferError {
    code: string;
    message: string;
}

export class WebRTCClient {
    private peerConnection: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private file: File | null = null;
    private state: TransferState = 'idle';
    private progress: TransferProgress | null = null;
    private stateChangeCallback: ((state: TransferState) => void) | null = null;
    private progressCallback: ((progress: TransferProgress) => void) | null =
        null;
    private errorCallback: ((error: TransferError) => void) | null = null;
    private fileReceivedCallback: ((file: File) => void) | null = null;
    private receivedChunks: Uint8Array[] = [];
    private totalBytesReceived = 0;
    private startTime: number | null = null;
    private chunkSize = 16384; // 16KB chunks

    constructor() {
        this.setupPeerConnection();
    }

    private setupPeerConnection(): void {
        const config: RTCConfiguration = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        };

        this.peerConnection = new RTCPeerConnection(config);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('New ICE candidate:', event.candidate);
                this.handleIceCandidate(event.candidate);
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            console.log('Data channel received');
            this.setupDataChannel(event.channel);
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log(
                'Connection state changed:',
                this.peerConnection?.connectionState,
            );
            if (this.peerConnection?.connectionState === 'connected') {
                this.setState('transferring');
            }
        };
    }

    private setupDataChannel(channel: RTCDataChannel): void {
        this.dataChannel = channel;
        this.dataChannel.binaryType = 'arraybuffer';

        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.setState('transferring');
            this.startTime = Date.now();
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.setState('completed');
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.handleError({
                code: 'data_channel_error',
                message: error.toString(),
            });
        };

        this.dataChannel.onmessage = (event) => {
            console.log('Received data chunk');
            this.handleReceivedData(event.data);
        };
    }

    private async startFileTransfer(): Promise<void> {
        if (!this.file || !this.dataChannel) return;

        const reader = new FileReader();
        let offset = 0;

        const readNextChunk = () => {
            if (offset >= this.file!.size) {
                this.dataChannel?.close();
                return;
            }

            const chunk = this.file!.slice(offset, offset + this.chunkSize);
            reader.readAsArrayBuffer(chunk);
            offset += this.chunkSize;
        };

        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                this.dataChannel?.send(reader.result);

                this.updateProgress({
                    bytesTransferred: offset,
                    totalBytes: this.file!.size,
                    speed: 0, // Will be calculated in the progress callback
                });
            }

            readNextChunk();
        };

        reader.onerror = () => {
            this.handleError({
                code: 'read_error',
                message: 'Error reading file',
            });
        };

        readNextChunk();
    }

    private handleReceivedData(data: ArrayBuffer): void {
        const chunk = new Uint8Array(data);
        this.receivedChunks.push(chunk);
        this.totalBytesReceived += chunk.length;

        if (this.progressCallback) {
            const elapsedTime = (Date.now() - (this.startTime || 0)) / 1000;
            const speed =
                elapsedTime > 0 ? this.totalBytesReceived / elapsedTime : 0;

            this.progressCallback({
                bytesTransferred: this.totalBytesReceived,
                totalBytes: this.file?.size || 0,
                speed,
            });
        }

        // If we've received all chunks, assemble the file
        if (this.totalBytesReceived === this.file?.size) {
            this.assembleFile();
        }
    }

    private assembleFile(): void {
        try {
            // Create a single Uint8Array from all chunks
            const totalLength = this.receivedChunks.reduce(
                (acc, chunk) => acc + chunk.length,
                0,
            );
            const result = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of this.receivedChunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }

            // Create a blob from the assembled data
            const blob = new Blob([result], {
                type: this.file?.type || 'application/octet-stream',
            });

            // Create a File object from the blob
            const file = new File([blob], this.file?.name || 'received_file', {
                type: this.file?.type || 'application/octet-stream',
            });

            if (this.fileReceivedCallback) {
                this.fileReceivedCallback(file);
            }

            this.setState('completed');
        } catch (error) {
            this.handleError({
                code: 'assembly_error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to assemble file',
            });
        }
    }

    async initiateSend(file: File, publicKey: string): Promise<void> {
        this.file = file;
        this.setState('connecting');

        try {
            const dataChannel =
                this.peerConnection?.createDataChannel('fileTransfer');
            if (dataChannel) {
                this.setupDataChannel(dataChannel);
            }

            const offer = await this.peerConnection?.createOffer();
            if (offer) {
                await this.peerConnection?.setLocalDescription(offer);
                // Send offer to peer through signaling server
                await this.handleOffer(offer);
            }
        } catch (error) {
            this.handleError({
                code: 'initiation_error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to initiate transfer',
            });
        }
    }

    async initiateReceive(
        publicKey: string,
        fileMetadata: FileMetadata,
    ): Promise<void> {
        this.setState('connecting');
        this.file = new File([], fileMetadata.name, {
            type: fileMetadata.type,
        });

        try {
            // Create data channel for receiving file
            const dataChannel = this.peerConnection?.createDataChannel(
                'fileTransfer',
                {
                    ordered: true,
                },
            );
            if (dataChannel) {
                this.setupDataChannel(dataChannel);
            }

            // Create and set local description
            const offer = await this.peerConnection?.createOffer();
            if (offer) {
                await this.peerConnection?.setLocalDescription(offer);
                // Send offer to peer through signaling server
                await this.handleOffer(offer);
            }
        } catch (error) {
            console.error('Error initiating receive:', error);
            this.handleError({
                code: 'initiation_error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to initiate receive',
            });
        }
    }

    private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        // Implement signaling logic to send offer to peer
        // This will be handled by your backend API
    }

    private async handleIceCandidate(
        candidate: RTCIceCandidate,
    ): Promise<void> {
        // Implement signaling logic to send ICE candidate to peer
        // This will be handled by your backend API
    }

    async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        try {
            await this.peerConnection?.setRemoteDescription(answer);
        } catch (error) {
            this.handleError({
                code: 'answer_error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to handle answer',
            });
        }
    }

    async handleRemoteIceCandidate(
        candidate: RTCIceCandidateInit,
    ): Promise<void> {
        try {
            await this.peerConnection?.addIceCandidate(candidate);
        } catch (error) {
            this.handleError({
                code: 'ice_candidate_error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to handle ICE candidate',
            });
        }
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

    cancel(): void {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.setState('idle');
        this.file = null;
        this.receivedChunks = [];
        this.totalBytesReceived = 0;
        this.startTime = null;
    }
}
