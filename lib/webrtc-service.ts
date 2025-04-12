import type { SignalData } from './signaling-service';

// Corrected import

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds

class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private onConnectionStateChangeCallback:
        | ((state: RTCPeerConnectionState) => void)
        | null = null;
    private onDataChannelStateChangeCallback:
        | ((state: RTCDataChannelState) => void)
        | null = null;
    private onDataReceivedCallback: ((data: ArrayBufferLike) => void) | null =
        null;
    private onSignalCallback: ((signal: SignalData) => void) | null = null;

    constructor() {
        this.initializePeerConnection();
    }

    private initializePeerConnection() {
        const config: RTCConfiguration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
        };

        this.peerConnection = new RTCPeerConnection(config);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.onSignalCallback) {
                this.onSignalCallback({
                    type: 'ice-candidate',
                    payload: event.candidate,
                });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            if (this.peerConnection && this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback(
                    this.peerConnection.connectionState,
                );
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };
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

    public async createOffer(): Promise<void> {
        if (!this.peerConnection) return;

        this.dataChannel = this.peerConnection.createDataChannel(
            'file-transfer',
            {
                ordered: true,
            },
        );
        this.setupDataChannel();

        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

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
        if (!this.peerConnection) {
            console.warn('Peer connection not initialized. Ignoring signal.');
            return;
        }

        try {
            if (signal.type === 'offer') {
                await this.peerConnection.setRemoteDescription(
                    new RTCSessionDescription(
                        signal.payload as RTCSessionDescriptionInit,
                    ),
                );
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);

                if (this.onSignalCallback) {
                    this.onSignalCallback({
                        type: 'answer',
                        payload: answer,
                    });
                }
            } else if (signal.type === 'answer') {
                await this.peerConnection.setRemoteDescription(
                    new RTCSessionDescription(
                        signal.payload as RTCSessionDescriptionInit,
                    ),
                );
            } else if (signal.type === 'ice-candidate') {
                await this.peerConnection.addIceCandidate(
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
        callback: (state: RTCPeerConnectionState) => void,
    ): void {
        this.onConnectionStateChangeCallback = callback;
    }

    public onDataChannelStateChange(
        callback: (state: RTCDataChannelState) => void,
    ): void {
        this.onDataChannelStateChangeCallback = callback;
    }

    public onDataReceived(callback: (data: ArrayBufferLike) => void): void {
        this.onDataReceivedCallback = callback;
    }

    public onSignal(callback: (signal: SignalData) => void): void {
        this.onSignalCallback = callback;
    }

    public close(): void {
        if (this.dataChannel) {
            this.dataChannel.close();
        }

        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.dataChannel = null;
        this.peerConnection = null;
    }

    public getConnectionState(): RTCPeerConnectionState {
        return this.peerConnection
            ? this.peerConnection.connectionState
            : 'closed';
    }

    public getDataChannelState(): RTCDataChannelState {
        return this.dataChannel ? this.dataChannel.readyState : 'closed';
    }
}

export default WebRTCService;
