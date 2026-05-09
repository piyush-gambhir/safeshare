declare module 'simple-peer' {
    export interface Instance {
        on(event: string, callback: (data: any) => void): void;
        signal(data: SignalData): void;
        send(data: ArrayBuffer): void;
        destroy(): void;
        connected: boolean;
        destroyed: boolean;
    }

    export interface SignalData {
        type: string;
        sdp?: string;
        candidate?: RTCIceCandidateInit;
    }

    export interface SimplePeerConfig {
        initiator: boolean;
        trickle: boolean;
        config?: RTCConfiguration;
    }

    export default class SimplePeer {
        constructor(opts?: SimplePeerConfig);
        on(event: string, callback: (data: any) => void): void;
        signal(data: SignalData): void;
        send(data: ArrayBuffer): void;
        destroy(): void;
        connected: boolean;
        destroyed: boolean;
    }
}
