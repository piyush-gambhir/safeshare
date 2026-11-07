'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
    ApiError,
    createSession,
    describeError,
    getSession,
    postSignal,
} from '@/lib/api';
import { exportTransferKey, generateTransferKey } from '@/lib/transfer-crypto';
import { formatBytes } from '@/lib/utils';
import {
    DATA_CHANNEL_LABEL,
    createPeerConnection,
    sendEncryptedFile,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

type Status =
    | 'idle'
    | 'preparing'
    | 'waiting'
    | 'connecting'
    | 'sending'
    | 'sent'
    | 'error';

const ANSWER_POLL_MS = 1500;

function delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener(
            'abort',
            () => {
                clearTimeout(timer);
                resolve();
            },
            { once: true },
        );
    });
}

// Polls the signaling API until the receiver has posted its answer.
async function waitForAnswer(
    sessionId: string,
    signal: AbortSignal,
): Promise<string | null> {
    while (!signal.aborted) {
        await delay(ANSWER_POLL_MS, signal);
        if (signal.aborted) break;
        try {
            const session = await getSession(sessionId);
            if (session.answer) return session.answer;
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) throw error;
            // Keep waiting through transient network errors.
        }
    }
    return null;
}

export default function FileTransfer() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [link, setLink] = useState('');
    const [sentBytes, setSentBytes] = useState(0);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(
        () => () => {
            abortRef.current?.abort();
            pcRef.current?.close();
        },
        [],
    );

    async function share() {
        if (!file) return;
        const abort = new AbortController();
        abortRef.current = abort;
        let done = false;

        const fail = (cause: unknown) => {
            if (abort.signal.aborted || done) return;
            abort.abort();
            pcRef.current?.close();
            setError(describeError(cause));
            setStatus('error');
        };

        setStatus('preparing');
        setError('');
        setSentBytes(0);
        try {
            const [session, key] = await Promise.all([
                createSession(),
                generateTransferKey(),
            ]);
            const pc = createPeerConnection();
            pcRef.current = pc;

            const channel = pc.createDataChannel(DATA_CHANNEL_LABEL, {
                ordered: true,
            });
            channel.binaryType = 'arraybuffer';
            channel.onopen = () => {
                setStatus('sending');
                sendEncryptedFile(channel, file, key, session.sessionId, setSentBytes)
                    .then(() => {
                        if (abort.signal.aborted) return;
                        done = true;
                        setStatus('sent');
                    })
                    .catch(fail);
            };
            // The receiver closes the connection once it has verified the file.
            channel.onclose = () => {
                if (done) pc.close();
            };
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed') {
                    fail(
                        new Error(
                            'Could not connect directly to the receiver. A strict NAT or firewall may be blocking peer-to-peer connections.',
                        ),
                    );
                }
            };

            await pc.setLocalDescription(await pc.createOffer());
            await waitForIceGathering(pc);
            await postSignal(session.sessionId, 'offer', pc.localDescription!.sdp);
            if (abort.signal.aborted) return;

            // The key goes only into the URL fragment, which browsers never send
            // to a server.
            const encodedKey = await exportTransferKey(key);
            setLink(
                `${window.location.origin}/receive/${session.sessionId}#k=${encodedKey}`,
            );
            setStatus('waiting');

            const answer = await waitForAnswer(session.sessionId, abort.signal);
            if (!answer) return;
            setStatus('connecting');
            await pc.setRemoteDescription({ type: 'answer', sdp: answer });
        } catch (cause) {
            fail(cause);
        }
    }

    function reset() {
        abortRef.current?.abort();
        pcRef.current?.close();
        pcRef.current = null;
        if (inputRef.current) inputRef.current.value = '';
        setFile(null);
        setLink('');
        setSentBytes(0);
        setError('');
        setCopied(false);
        setStatus('idle');
    }

    async function copyLink() {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const size = file?.size ?? 0;
    const percent =
        status === 'sent' ? 100 : size > 0 ? Math.floor((sentBytes / size) * 100) : 0;
    const statusText: Record<Status, string> = {
        idle: '',
        preparing: 'Creating an encrypted session',
        waiting: 'Waiting for the receiver to open the link',
        connecting: 'Connecting directly to the receiver',
        sending: `Sending ${formatBytes(sentBytes)} of ${formatBytes(size)}`,
        sent: `Sent ${formatBytes(size)}`,
        error: '',
    };

    return (
        <Card className="mx-auto w-full max-w-md">
            <CardHeader>
                <CardTitle>Send a file</CardTitle>
                <CardDescription>
                    Encrypted in your browser before it leaves. The server
                    never sees the file or its name.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="file">File</Label>
                    <Input
                        id="file"
                        ref={inputRef}
                        type="file"
                        onChange={(event) =>
                            setFile(event.target.files?.[0] ?? null)
                        }
                        disabled={status !== 'idle'}
                    />
                </div>

                {link && (
                    <div className="space-y-2">
                        <Label htmlFor="shareLink">Share link</Label>
                        <div className="flex items-start gap-2">
                            <output
                                id="shareLink"
                                className="min-w-0 flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-xs break-all"
                            >
                                {link}
                            </output>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={copyLink}
                                aria-label="Copy share link"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            The part after # is the decryption key. Anyone with
                            the full link can receive the file, so share it
                            over a channel you trust.
                        </p>
                    </div>
                )}

                {status !== 'idle' && status !== 'error' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>{statusText[status]}</span>
                            {(status === 'sending' || status === 'sent') && (
                                <span>{percent}%</span>
                            )}
                        </div>
                        {(status === 'sending' || status === 'sent') && (
                            <Progress value={percent} />
                        )}
                    </div>
                )}

                {status === 'error' && (
                    <p className="text-sm text-destructive" role="alert">
                        {error}
                    </p>
                )}
            </CardContent>
            <CardFooter>
                {status === 'idle' ? (
                    <Button onClick={share} disabled={!file}>
                        Create share link
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        onClick={reset}
                        disabled={status === 'preparing'}
                    >
                        {status === 'sent' || status === 'error'
                            ? 'Send another file'
                            : 'Cancel'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
