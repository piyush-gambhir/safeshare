declare module 'simple-peer' {
    interface PeerInstance {
        on(
            event: 'connect' | 'data' | 'error' | 'close',
            callback: (data?: any) => void,
        ): void;
        signal(data: any): void;
        destroy(): void;
    }

    interface PeerOptions {
        initiator: boolean;
        trickle: boolean;
        config?: {
            iceServers: Array<{
                urls: string;
            }>;
        };
    }

    class SimplePeer {
        constructor(options: PeerOptions);
        on(
            event: 'connect' | 'data' | 'error' | 'close',
            callback: (data?: any) => void,
        ): void;
        signal(data: any): void;
        destroy(): void;
    }

    export default SimplePeer;
}
