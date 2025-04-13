import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import WebTorrent from 'webtorrent';

interface FileMetadata {
    name: string;
    size: number;
    type: string;
}

interface SessionInfo {
    sessionId: string;
    publicKey: string;
    torrentInfoHash: string;
    magnetUri: string;
    fileMetadata: FileMetadata;
    status: string;
    expiresAt: number;
}

// Extend WebTorrent types to include all event types
declare module 'webtorrent' {
    interface Torrent {
        on(
            event:
                | 'error'
                | 'warning'
                | 'peer'
                | 'metadata'
                | 'download'
                | 'done',
            callback: (arg?: any) => void,
        ): void;
    }
}

export default function FileDownloader() {
    const router = useRouter();
    const { sessionId } = router.query;
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [status, setStatus] = useState('connecting');
    const [error, setError] = useState<string | null>(null);
    const clientRef = useRef<WebTorrent.Instance | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!sessionId) return;

        // Fetch session info
        const fetchSessionInfo = async () => {
            try {
                const response = await fetch(`/api/share/session/${sessionId}`);
                if (!response.ok)
                    throw new Error('Failed to fetch session info');
                const data = await response.json();
                setSessionInfo(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to fetch session info',
                );
            }
        };

        fetchSessionInfo();

        // Set up WebSocket connection for status updates
        const ws = new WebSocket(
            `ws://localhost:8000/v1/share/status/${sessionId}`,
        );
        wsRef.current = ws;

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setStatus(data.status);
            if (data.progress) setDownloadProgress(data.progress);
        };

        ws.onerror = () => {
            setError('WebSocket connection error');
        };

        return () => {
            ws.close();
            if (clientRef.current) {
                clientRef.current.destroy();
            }
        };
    }, [sessionId]);

    useEffect(() => {
        if (!sessionInfo?.magnetUri) return;

        // Initialize WebTorrent client with WebRTC configuration
        const client = new WebTorrent({
            tracker: {
                rtcConfig: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
            },
        });
        clientRef.current = client;

        // Add the torrent
        client.add(sessionInfo.magnetUri, (torrent) => {
            console.log('Torrent added:', torrent.infoHash);

            // Handle download progress
            torrent.on('download', (bytes) => {
                const progress = (torrent.progress * 100).toFixed(1);
                setDownloadProgress(Number(progress));
                console.log('Download progress:', progress, '%');
            });

            // Handle completion
            torrent.on('done', () => {
                console.log('Download complete');
                setStatus('completed');
                setDownloadProgress(100);

                // Get the file and create download link
                const file = torrent.files[0];
                file.getBlob((err, blob) => {
                    if (err) {
                        console.error('Error getting blob:', err);
                        setError(err.message);
                        return;
                    }

                    if (!blob) {
                        setError('Failed to get file blob');
                        return;
                    }

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
            });

            // Handle errors
            torrent.on('error', (err) => {
                console.error('Torrent error:', err);
                setError(err.message);
                setStatus('error');
            });

            // Log peer connections
            torrent.on('wire', (wire) => {
                console.log('New peer connected:', wire.peerId);
            });

            // Log when metadata is received
            torrent.on('metadata', () => {
                console.log('Metadata received');
            });
        });

        return () => {
            if (clientRef.current) {
                clientRef.current.destroy();
            }
        };
    }, [sessionInfo]);

    if (error) {
        return (
            <div
                style={{
                    padding: '1rem',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                }}
            >
                {error}
            </div>
        );
    }

    if (!sessionInfo) {
        return (
            <div
                style={{
                    textAlign: 'center',
                    padding: '2rem',
                }}
            >
                Loading...
            </div>
        );
    }

    return (
        <div
            style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '2rem',
                boxShadow:
                    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            }}
        >
            <h2
                style={{
                    marginBottom: '1rem',
                    fontSize: '1.5rem',
                    fontWeight: '600',
                }}
            >
                Downloading {sessionInfo.fileMetadata.name}
            </h2>
            <div
                style={{
                    marginBottom: '1rem',
                }}
            >
                <div
                    style={{
                        height: '0.5rem',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '0.25rem',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            backgroundColor: '#3b82f6',
                            width: `${downloadProgress}%`,
                            transition: 'width 0.3s ease-in-out',
                        }}
                    />
                </div>
                <div
                    style={{
                        marginTop: '0.5rem',
                        textAlign: 'center',
                        color: '#6b7280',
                    }}
                >
                    {downloadProgress}%
                </div>
            </div>
            <div
                style={{
                    textAlign: 'center',
                    color: '#6b7280',
                }}
            >
                Status: {status}
            </div>
        </div>
    );
}
