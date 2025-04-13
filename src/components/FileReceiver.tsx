import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';

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

export default function FileReceiver() {
    const router = useRouter();
    const { sessionId } = router.query;
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [status, setStatus] = useState('connecting');
    const [error, setError] = useState<string | null>(null);
    const peerRef = useRef<SimplePeer | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const receivedChunksRef = useRef<Uint8Array[]>([]);
    const totalSizeRef = useRef<number>(0);

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
                totalSizeRef.current = data.fileMetadata.size;
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to fetch session info',
                );
            }
        };

        fetchSessionInfo();

        // Set up WebSocket connection for signaling
        const ws = new WebSocket(
            `ws://localhost:8000/v1/share/status/${sessionId}`,
        );
        wsRef.current = ws;

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'offer') {
                // Create peer connection
                const peer = new SimplePeer({
                    initiator: false,
                    trickle: false,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' },
                        ],
                    },
                });
                peerRef.current = peer;

                // Handle incoming data
                peer.on('data', (chunk: Uint8Array) => {
                    receivedChunksRef.current.push(chunk);
                    const progress =
                        (receivedChunksRef.current.reduce(
                            (acc, chunk) => acc + chunk.length,
                            0,
                        ) /
                            totalSizeRef.current) *
                        100;
                    setDownloadProgress(Math.min(progress, 100));
                });

                // Handle connection
                peer.on('connect', () => {
                    console.log('Peer connected');
                    setStatus('connected');
                });

                // Handle errors
                peer.on('error', (err: Error) => {
                    console.error('Peer error:', err);
                    setError(err.message);
                    setStatus('error');
                });

                // Handle completion
                peer.on('close', () => {
                    console.log('Peer connection closed');
                    if (receivedChunksRef.current.length > 0) {
                        const fileData = new Uint8Array(
                            receivedChunksRef.current.reduce(
                                (acc, chunk) => acc + chunk.length,
                                0,
                            ),
                        );
                        let offset = 0;
                        receivedChunksRef.current.forEach((chunk) => {
                            fileData.set(chunk, offset);
                            offset += chunk.length;
                        });

                        const blob = new Blob([fileData], {
                            type: sessionInfo?.fileMetadata.type,
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download =
                            sessionInfo?.fileMetadata.name || 'downloaded-file';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        setStatus('completed');
                    }
                });

                // Set remote description
                peer.signal(data.offer);
            }
        };

        ws.onerror = () => {
            setError('WebSocket connection error');
        };

        return () => {
            ws.close();
            if (peerRef.current) {
                peerRef.current.destroy();
            }
        };
    }, [sessionId]);

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
                Receiving {sessionInfo.fileMetadata.name}
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
                    {downloadProgress.toFixed(1)}%
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
