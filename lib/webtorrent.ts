import WebTorrent from 'webtorrent';
import { Torrent, TorrentFile } from 'webtorrent';

// Initialize WebTorrent client
const client = new WebTorrent();

// Function to create a torrent from a file
export const createTorrent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        client.seed(file, (torrent: Torrent) => {
            const magnetUri = torrent.magnetURI;
            resolve(magnetUri);
        });
    });
};

// Function to download a file using magnet URI
export const downloadFile = async (magnetUri: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        client.add(magnetUri, (torrent: Torrent) => {
            torrent.on('done', () => {
                const file = torrent.files[0];
                file.getBlob((err: Error | null, blob: Blob) => {
                    if (err) reject(err);
                    const downloadedFile = new File([blob], file.name, {
                        type: file.type,
                    });
                    resolve(downloadedFile);
                });
            });
        });
    });
};

// Function to get download progress
export const getDownloadProgress = (magnetUri: string): Promise<number> => {
    return new Promise((resolve) => {
        const torrent = client.get(magnetUri);
        if (torrent) {
            resolve(torrent.progress * 100);
        } else {
            resolve(0);
        }
    });
};

// Function to get upload progress
export const getUploadProgress = (magnetUri: string): Promise<number> => {
    return new Promise((resolve) => {
        const torrent = client.get(magnetUri);
        if (torrent) {
            resolve(torrent.progress * 100);
        } else {
            resolve(0);
        }
    });
};

// Function to get number of peers
export const getPeerCount = (magnetUri: string): Promise<number> => {
    return new Promise((resolve) => {
        const torrent = client.get(magnetUri);
        if (torrent) {
            resolve(torrent.numPeers);
        } else {
            resolve(0);
        }
    });
};

// Function to destroy a torrent
export const destroyTorrent = (magnetUri: string): void => {
    const torrent = client.get(magnetUri);
    if (torrent) {
        torrent.destroy();
    }
};
