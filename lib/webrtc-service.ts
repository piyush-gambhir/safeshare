import type { Instance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';

import type { SignalData } from './signaling-service';

// Corrected import

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds

export interface WebRTCConfig {
    iceServers: Array<{ urls: string }>;
}

export type ConnectionState =
    | 'new'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'closed'
    | 'failed';
export type DataChannelState = 'connecting' | 'open' | 'closing' | 'closed';

export class WebRTCService {
    private peer: Instance | null = null;
    private config: WebRTCConfig;
    private dataChannel: RTCDataChannel | null = null;
    private onConnectionStateChangeCallback:
        | ((state: ConnectionState) => void)
        | null = null;
    private onDataChannelStateChangeCallback:
        | ((state: DataChannelState) => void)
        | null = null;
    private onDataReceivedCallback: ((data: ArrayBuffer) => void) | null = null;
    private onSignalCallback: ((signal: PeerSignalData) => void) | null = null;

    constructor(config?: WebRTCConfig) {
        this.config = config || {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
            ],
        };
        this.initializePeerConnection();
    }

    private initializePeerConnection() {
        const config: RTCConfiguration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
        };

        this.peer = new SimplePeer({
            initiator: true,
            trickle: true,
            config: this.config,
        });

        this.setupPeerEvents();
    }

    private setupPeerEvents(): void {
        if (!this.peer) return;

        this.peer.on('signal', (data: PeerSignalData) => {
            if (this.onSignalCallback) {
                this.onSignalCallback(data);
            }
        });

        this.peer.on('connect', () => {
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('connected');
            }
        });

        this.peer.on('close', () => {
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('closed');
            }
        });

        this.peer.on('error', (err: Error) => {
            console.error('Peer connection error:', err);
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('failed');
            }
        });

        this.peer.on('data', (data: ArrayBuffer) => {
            if (this.onDataReceivedCallback) {
                this.onDataReceivedCallback(data);
            }
        });
    }

    createPeer(initiator: boolean): Instance {
        this.peer = new SimplePeer({
            initiator,
            trickle: true,
            config: this.config,
        });
        this.setupPeerEvents();
        return this.peer;
    }

    destroyPeer(): void {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
    }

    getPeer(): Instance | null {
        return this.peer;
    }

    public async createOffer(): Promise<void> {
        if (!this.peer) return;

        this.dataChannel = this.peer.signalDataChannel;
        this.setupDataChannel();

        try {
            const offer = await this.peer.signalDataChannel.createOffer();
            await this.peer.signalDataChannel.setLocalDescription(offer);

            if (this.onSignalCallback) {
                this.onSignalCallback({
                    type: 'offer',
                    payload: offer,
                });
            }
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    }

    // Method to handle incoming signals
    async handleSignal(signal: SignalData): Promise<void> {
        if (!this.peer) {
            console.warn('Peer connection not initialized. Ignoring signal.');
            return;
        }

        try {
            if (signal.type === 'offer') {
                await this.peer.signalDataChannel.setRemoteDescription(
                    new RTCSessionDescription(
                        signal.payload as RTCSessionDescriptionInit,
                    ),
                );
                const answer = await this.peer.signalDataChannel.createAnswer();
                await this.peer.signalDataChannel.setLocalDescription(answer);

                if (this.onSignalCallback) {
                    this.onSignalCallback({
                        type: 'answer',
                        payload: answer,
                    });
                }
            } else if (signal.type === 'answer') {
                await this.peer.signalDataChannel.setRemoteDescription(
                    new RTCSessionDescription(
                        signal.payload as RTCSessionDescriptionInit,
                    ),
                );
            } else if (signal.type === 'ice-candidate') {
                await this.peer.signalDataChannel.addIceCandidate(
                    new RTCIceCandidate(signal.payload as RTCIceCandidateInit),
                );
            } else {
                console.warn('Received unknown signal type:', signal);
            }
        } catch (error) {
            console.error('Error handling signal:', error);
            throw error;
        }
    }

    public sendData(data: ArrayBufferLike): boolean {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            return false;
        }

        try {
            // Convert to Uint8Array for sending
            const dataArray = new Uint8Array(data);
            this.dataChannel.send(dataArray);
            return true;
        } catch (error) {
            console.error('Error sending data:', error);
            return false;
        }
    }

    public onConnectionStateChange(
        callback: (state: ConnectionState) => void,
    ): void {
        this.onConnectionStateChangeCallback = callback;
    }

    public onDataChannelStateChange(
        callback: (state: DataChannelState) => void,
    ): void {
        this.onDataChannelStateChangeCallback = callback;
    }

    public onDataReceived(callback: (data: ArrayBuffer) => void): void {
        this.onDataReceivedCallback = callback;
    }

    public onSignal(callback: (signal: PeerSignalData) => void): void {
        this.onSignalCallback = callback;
    }

    public close(): void {
        if (this.dataChannel) {
            this.dataChannel.close();
        }

        if (this.peer) {
            this.peer.destroy();
        }

        this.dataChannel = null;
        this.peer = null;
    }

    public getConnectionState(): ConnectionState {
        if (!this.peer) return 'closed';
        if (this.peer.connected) return 'connected';
        if (this.peer.destroyed) return 'closed';
        return 'connecting';
    }

    public getDataChannelState(): RTCDataChannelState {
        return this.dataChannel ? this.dataChannel.readyState : 'closed';
    }

    private setupDataChannel() {
        if (!this.dataChannel) return;

        this.dataChannel.binaryType = 'arraybuffer';

        this.dataChannel.onopen = () => {
            if (this.onDataChannelStateChangeCallback) {
                this.onDataChannelStateChangeCallback('open');
            }
        };

        this.dataChannel.onclose = () => {
            if (this.onDataChannelStateChangeCallback) {
                this.onDataChannelStateChangeCallback('closed');
            }
        };

        this.dataChannel.onmessage = (event) => {
            if (this.onDataReceivedCallback) {
                this.onDataReceivedCallback(event.data);
            }
        };
    }

    signal(data: PeerSignalData): void {
        if (this.peer) {
            this.peer.signal(data);
        }
    }

    send(data: ArrayBuffer): void {
        if (this.peer && this.peer.connected) {
            this.peer.send(data);
        }
    }
}

export default WebRTCService;
