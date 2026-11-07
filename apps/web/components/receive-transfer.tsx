'use client';

import { Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { describeError, getSession, postSignal } from '@/lib/api';
import {
    type FileMetadata,
    TransferError,
    importTransferKey,
    keyFromFragment,
} from '@/lib/transfer-crypto';
import { formatBytes } from '@/lib/utils';
import {
    createPeerConnection,
    receiveEncryptedFile,
    waitForIceGathering,
} from '@/lib/webrtc';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Phase =
    | { kind: 'checking' }
    | { kind: 'invalid'; message: string }
    | { kind: 'ready' }
    | { kind: 'connecting' }
    | { kind: 'receiving'; metadata: FileMetadata; received: number }
    | { kind: 'complete'; metadata: FileMetadata; file: Blob }
    | { kind: 'error'; message: string };

const SESSION_ID = /^[0-9a-f]{32}$/;

async function keyForLink(
    sessionId: string,
    encodedKey: string | null,
): Promise<CryptoKey> {
    if (!SESSION_ID.test(sessionId)) {
        throw new TransferError('This link is not valid.');
    }
    if (!encodedKey) {
        throw new TransferError(
            'This link is missing its decryption key. Ask the sender for the full link, including the part after #.',
        );
    }
    return importTransferKey(encodedKey);
}

function downloadName(name: string): string {
    return name.replace(/[\\/\u0000-\u001f]/g, '_');
}

function saveBlob(file: Blob, name: string) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadName(name);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function ReceiveTransfer({ sessionId }: { sessionId: string }) {
    const [phase, setPhase] = useState<Phase>({ kind: 'checking' });
    const keyRef = useRef<CryptoKey | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const checkedRef = useRef(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        if (checkedRef.current) return;
        checkedRef.current = true;

        const encodedKey = keyFromFragment(window.location.hash);
        // Drop the key from the address bar, history and the Next.js router.
        // A null state goes through Next's patched replaceState, which also
        // updates the router's URL; the timeout lets the router install that
        // patch, since its effect runs after this one.
        if (window.location.hash) {
            setTimeout(() =>
                window.history.replaceState(
                    null,
                    '',
                    window.location.pathname + window.location.search,
                ),
            );
        }

        keyForLink(sessionId, encodedKey).then(
            (key) => {
                keyRef.current = key;
                setPhase({ kind: 'ready' });
            },
            (error) => setPhase({ kind: 'invalid', message: describeError(error) }),
        );
    }, [sessionId]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            pcRef.current?.close();
        };
    }, []);

    async function receive() {
        const key = keyRef.current;
        if (!key) return;
        let done = false;
        let cancelReceive: (() => void) | null = null;

        const fail = (cause: unknown) => {
            if (done) return;
            done = true;
            cancelReceive?.();
            pcRef.current?.close();
            setPhase({ kind: 'error', message: describeError(cause) });
        };

        setPhase({ kind: 'connecting' });
        try {
            const session = await getSession(sessionId);
            if (!mountedRef.current) return;
            if (!session.offer) {
                throw new Error('The sender has not finished setting up this link.');
            }
            if (session.answer) {
                throw new Error(
                    'This link has already been used. Ask the sender for a new one.',
                );
            }

            const pc = createPeerConnection();
            pcRef.current = pc;
            pc.ondatachannel = (event) => {
                cancelReceive = receiveEncryptedFile(event.channel, key, sessionId, {
                    onMetadata: (metadata) => {
                        if (done) return;
                        setPhase({ kind: 'receiving', metadata, received: 0 });
                    },
                    onProgress: (received) => {
                        if (done) return;
                        setPhase((current) =>
                            current.kind === 'receiving'
                                ? { ...current, received }
                                : current,
                        );
                    },
                    onComplete: (file, metadata) => {
                        if (done) return;
                        done = true;
                        pc.close();
                        setPhase({ kind: 'complete', metadata, file });
                    },
                    onError: fail,
                });
            };
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed') {
                    fail(
                        new Error(
                            'Could not connect directly to the sender. A strict NAT or firewall may be blocking peer-to-peer connections.',
                        ),
                    );
                }
            };

            await pc.setRemoteDescription({ type: 'offer', sdp: session.offer });
            await pc.setLocalDescription(await pc.createAnswer());
            await waitForIceGathering(pc);
            if (!mountedRef.current) {
                pc.close();
                return;
            }
            await postSignal(sessionId, 'answer', pc.localDescription!.sdp);
        } catch (cause) {
            fail(cause);
        }
    }

    const percent =
        phase.kind === 'receiving'
            ? phase.metadata.size > 0
                ? Math.floor((phase.received / phase.metadata.size) * 100)
                : 100
            : 0;

    return (
        <Card className="mx-auto w-full max-w-md">
            <CardHeader>
                <CardTitle>Receive a file</CardTitle>
                <CardDescription>
                    End-to-end encrypted. The key in your link never reaches the
                    server.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {phase.kind === 'ready' && (
                    <p className="text-sm text-muted-foreground">
                        The file name and contents are decrypted only in this
                        browser, after a direct connection to the sender.
                    </p>
                )}
                {phase.kind === 'connecting' && (
                    <p className="text-sm">Connecting directly to the sender</p>
                )}
                {(phase.kind === 'receiving' || phase.kind === 'complete') && (
                    <div className="space-y-1">
                        <p className="font-medium break-all">
                            {phase.metadata.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {formatBytes(phase.metadata.size)}
                        </p>
                    </div>
                )}
                {phase.kind === 'receiving' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>
                                Receiving {formatBytes(phase.received)} of{' '}
                                {formatBytes(phase.metadata.size)}
                            </span>
                            <span>{percent}%</span>
                        </div>
                        <Progress value={percent} />
                    </div>
                )}
                {phase.kind === 'complete' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Decrypted and verified</span>
                            <span>100%</span>
                        </div>
                        <Progress value={100} />
                    </div>
                )}
                {(phase.kind === 'invalid' || phase.kind === 'error') && (
                    <p className="text-sm text-destructive" role="alert">
                        {phase.message}
                    </p>
                )}
            </CardContent>
            {(phase.kind === 'ready' || phase.kind === 'complete') && (
                <CardFooter>
                    {phase.kind === 'ready' ? (
                        <Button onClick={receive}>Connect and receive</Button>
                    ) : (
                        <Button
                            onClick={() =>
                                saveBlob(phase.file, phase.metadata.name)
                            }
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}
