export type SignalData = {
    type: 'offer' | 'answer' | 'ice-candidate';
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
    // Add candidate property for backward compatibility or specific signaling needs if required
    candidate?: RTCIceCandidateInit | null;
};

export interface SignalingChannel {
    id: string;
    peerId: string | null;
    created: number;
    expires: number;
}

export class SignalingService {
    private static readonly API_ENDPOINT = '/api/signaling';
    private static readonly POLLING_INTERVAL = 2000; // 2 seconds

    private channelId: string | null = null;
    private peerId: string | null = null;
    private pollingInterval: NodeJS.Timeout | null = null;

    private onSignalCallback: ((signal: SignalData) => void) | null = null;
    private onChannelCreatedCallback: ((channelId: string) => void) | null =
        null;
    private onPeerConnectedCallback: ((peerId: string) => void) | null = null;

    public async createChannel(): Promise<string> {
        try {
            const response = await fetch(
                `${SignalingService.API_ENDPOINT}/channel`,
                {
                    method: 'POST',
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to create channel: ${response.statusText}`,
                );
            }

            const data = await response.json();
            const channelId = data.id;
            if (!channelId) {
                throw new Error('Server did not return a valid channel ID');
            }
            this.channelId = channelId;

            if (this.onChannelCreatedCallback) {
                this.onChannelCreatedCallback(channelId);
            }

            this.startPolling();

            return channelId;
        } catch (error) {
            console.error('Error creating signaling channel:', error);
            throw error;
        }
    }

    public async joinChannel(channelId: string): Promise<void> {
        try {
            const response = await fetch(
                `${SignalingService.API_ENDPOINT}/channel/${channelId}/join`,
                {
                    method: 'POST',
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to join channel: ${response.statusText}`,
                );
            }

            const data = await response.json();
            this.channelId = channelId;
            this.peerId = data.peerId;

            if (this.onPeerConnectedCallback && this.peerId) {
                this.onPeerConnectedCallback(this.peerId);
            }

            this.startPolling();
        } catch (error) {
            console.error('Error joining signaling channel:', error);
            throw error;
        }
    }

    public async sendSignal(signal: SignalData): Promise<void> {
        if (!this.channelId) {
            throw new Error('No active signaling channel');
        }

        try {
            const response = await fetch(
                `${SignalingService.API_ENDPOINT}/channel/${this.channelId}/signal`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(signal),
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to send signal: ${response.statusText}`,
                );
            }
        } catch (error) {
            console.error('Error sending signal:', error);
            throw error;
        }
    }

    private startPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(() => {
            this.pollSignals();
        }, SignalingService.POLLING_INTERVAL);
    }

    private async pollSignals(): Promise<void> {
        if (!this.channelId) {
            return;
        }

        try {
            const response = await fetch(
                `${SignalingService.API_ENDPOINT}/channel/${this.channelId}/signals`,
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to poll signals: ${response.statusText}`,
                );
            }

            const data = await response.json();

            if (data.signals && data.signals.length > 0) {
                for (const signal of data.signals) {
                    if (this.onSignalCallback) {
                        this.onSignalCallback(signal);
                    }
                }
            }

            if (data.peerId && !this.peerId) {
                const peerId = data.peerId;
                if (!peerId) {
                    throw new Error('Server did not return a valid peer ID');
                }
                this.peerId = peerId;

                if (this.onPeerConnectedCallback) {
                    this.onPeerConnectedCallback(peerId);
                }
            }
        } catch (error) {
            console.error('Error polling signals:', error);
        }
    }

    public closeChannel(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        if (this.channelId) {
            fetch(
                `${SignalingService.API_ENDPOINT}/channel/${this.channelId}/close`,
                {
                    method: 'POST',
                },
            ).catch((error) => {
                console.error('Error closing signaling channel:', error);
            });

            this.channelId = null;
            this.peerId = null;
        }
    }

    public onSignal(callback: (signal: SignalData) => void): void {
        this.onSignalCallback = callback;
    }

    public onChannelCreated(callback: (channelId: string) => void): void {
        this.onChannelCreatedCallback = callback;
    }

    public onPeerConnected(callback: (peerId: string) => void): void {
        this.onPeerConnectedCallback = callback;
    }

    public getChannelId(): string | null {
        return this.channelId;
    }

    public getPeerId(): string | null {
        return this.peerId;
    }
}
