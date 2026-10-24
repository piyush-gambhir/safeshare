declare module 'webtorrent' {
    namespace WebTorrent {
        interface Torrent {
            infoHash: string;
            magnetURI: string;
            files: TorrentFile[];
            progress: number;
            downloadSpeed: number;
            uploadSpeed: number;
            timeRemaining: number;
            numPeers: number;
            path: string;
            ready: boolean;
            paused: boolean;
            done: boolean;
            created: Date;
            createdBy: string;
            comment: string;
            on(event: 'infoHash', callback: () => void): void;
            on(event: 'metadata', callback: () => void): void;
            on(event: 'ready', callback: () => void): void;
            on(
                event: 'warning' | 'error',
                callback: (err: Error) => void,
            ): void;
            on(
                event: 'download' | 'upload',
                callback: (bytes: number) => void,
            ): void;
            on(event: 'done', callback: () => void): void;
            on(event: 'wire', callback: (wire: any) => void): void;
            appendTo(
                element: HTMLElement | string,
                opts?: any,
                callback?: (err: Error) => void,
            ): void;
            createServer(opts?: any): any;
            select(start: number, end: number, priority?: number): void;
            deselect(start: number, end: number, priority?: number): void;
            createReadStream(opts?: any): any;
            getBuffer(
                callback: (err: Error | null, buffer?: Buffer) => void,
            ): void;
            getBlobURL(
                callback: (err: Error | null, url?: string) => void,
            ): void;
            getBlob(callback: (err: Error | null, blob?: Blob) => void): void;
        }

        interface TorrentFile {
            name: string;
            path: string;
            length: number;
            offset: number;
            select(): void;
            deselect(): void;
            createReadStream(opts?: any): any;
            getBuffer(
                callback: (err: Error | null, buffer?: Buffer) => void,
            ): void;
            appendTo(
                element: HTMLElement | string,
                opts?: any,
                callback?: (err: Error) => void,
            ): void;
            getBlobURL(
                callback: (err: Error | null, url?: string) => void,
            ): void;
            blob(): Promise<Blob>;
        }

        interface Instance {
            add(
                magnetUri: string,
                callback: (torrent: Torrent) => void,
            ): Torrent;
            add(
                magnetUri: string,
                opts?: any,
                callback?: (torrent: Torrent) => void,
            ): Torrent;
            seed(
                files: File | File[],
                opts?: any,
                callback?: (torrent: Torrent) => void,
            ): Torrent;
            remove(
                torrentId: string | Torrent,
                callback?: (err: Error) => void,
            ): void;
            get(torrentId: string | Torrent): Torrent | undefined;
            destroy(callback?: (err: Error) => void): void;
            on(event: 'torrent', callback: (torrent: Torrent) => void): void;
            on(event: 'error', callback: (err: Error) => void): void;
        }

        interface WebTorrentOptions {
            maxConns?: number;
            nodeId?: string | Buffer;
            peerId?: string | Buffer;
            tracker?: {
                rtcConfig?: RTCConfiguration;
            };
            dht?: boolean | object;
            webSeeds?: boolean;
        }
    }
    const WebTorrent: {
        new (opts?: WebTorrent.WebTorrentOptions): WebTorrent.Instance;
    };
    export = WebTorrent;
}
