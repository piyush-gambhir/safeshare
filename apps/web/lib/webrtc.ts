// WebRTC plumbing: peer connection setup, non-trickle ICE, and sending or
// receiving an end-to-end encrypted file over a data channel.
import {
    CHUNK_SIZE,
    type FileMetadata,
    TransferDecryptor,
    TransferEncryptor,
    TransferError,
} from '@/lib/transfer-crypto';

export const DATA_CHANNEL_LABEL = 'safeshare';

const ICE_SERVERS: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];
const ICE_GATHERING_TIMEOUT_MS = 5000;

// Sending pauses above HIGH_WATER buffered bytes and resumes below LOW_WATER,
// well under the browsers' data-channel send-buffer limits.
const HIGH_WATER = 4 * 1024 * 1024;
const LOW_WATER = 1024 * 1024;

export function createPeerConnection(): RTCPeerConnection {
    return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

// The signaling API stores one SDP per side (no trickle ICE), so wait until the
// local description includes the gathered candidates. After the timeout, go
// ahead with the candidates found so far.
export function waitForIceGathering(
    pc: RTCPeerConnection,
    timeoutMs = ICE_GATHERING_TIMEOUT_MS,
): Promise<void> {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
        const finish = () => {
            clearTimeout(timer);
            pc.removeEventListener('icegatheringstatechange', onChange);
            resolve();
        };
        const onChange = () => {
            if (pc.iceGatheringState === 'complete') finish();
        };
        const timer = setTimeout(finish, timeoutMs);
        pc.addEventListener('icegatheringstatechange', onChange);
    });
}

function closedError(): TransferError {
    return new TransferError('The connection closed during the transfer.');
}

function waitForBuffer(channel: RTCDataChannel, threshold: number): Promise<void> {
    // A closed channel can keep a nonzero bufferedAmount and fires no more events.
    if (channel.readyState !== 'open') return Promise.reject(closedError());
    if (channel.bufferedAmount <= threshold) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            channel.removeEventListener('bufferedamountlow', onLow);
            channel.removeEventListener('close', onClose);
        };
        const onLow = () => {
            if (channel.bufferedAmount > threshold) return;
            cleanup();
            resolve();
        };
        const onClose = () => {
            cleanup();
            reject(closedError());
        };
        channel.addEventListener('bufferedamountlow', onLow);
        channel.addEventListener('close', onClose);
    });
}

// Sends metadata, every chunk and the end message, all encrypted, then waits
// until the channel's buffer has drained to the network.
export async function sendEncryptedFile(
    channel: RTCDataChannel,
    file: File,
    key: CryptoKey,
    transferId: string,
    onProgress: (sentBytes: number) => void,
): Promise<void> {
    const encryptor = new TransferEncryptor(key, transferId);
    channel.bufferedAmountLowThreshold = LOW_WATER;

    const send = async (message: ArrayBuffer) => {
        if (channel.bufferedAmount > HIGH_WATER) {
            await waitForBuffer(channel, LOW_WATER);
        }
        if (channel.readyState !== 'open') throw closedError();
        channel.send(message);
    };

    await send(
        await encryptor.metadata({ name: file.name, size: file.size, type: file.type }),
    );

    let sent = 0;
    while (sent < file.size) {
        const chunk = new Uint8Array(
            await file.slice(sent, sent + CHUNK_SIZE).arrayBuffer(),
        );
        if (chunk.byteLength === 0) {
            throw new TransferError('The file changed while it was being sent.');
        }
        await send(await encryptor.chunk(chunk));
        sent += chunk.byteLength;
        onProgress(sent);
    }

    await send(await encryptor.end());
    channel.bufferedAmountLowThreshold = 0;
    await waitForBuffer(channel, 0);
}

export interface ReceiveHandlers {
    onMetadata: (metadata: FileMetadata) => void;
    onProgress: (receivedBytes: number) => void;
    onComplete: (file: Blob, metadata: FileMetadata) => void;
    onError: (error: Error) => void;
}

// Decrypts messages as they arrive. A decryption failure, an unexpected
// message, or the channel closing before the authenticated end message aborts
// the transfer and drops everything received. The returned function cancels
// the transfer silently, for example when the peer connection fails.
export function receiveEncryptedFile(
    channel: RTCDataChannel,
    key: CryptoKey,
    transferId: string,
    handlers: ReceiveHandlers,
): () => void {
    const decryptor = new TransferDecryptor(key, transferId);
    let parts: ArrayBuffer[] = [];
    let received = 0;
    let finished = false;
    let pending: Promise<void> = Promise.resolve();

    const fail = (error: unknown) => {
        if (finished) return;
        finished = true;
        parts = [];
        channel.close();
        handlers.onError(
            error instanceof Error ? error : new TransferError('The transfer failed.'),
        );
    };

    channel.binaryType = 'arraybuffer';
    channel.onmessage = (event: MessageEvent) => {
        if (finished) return;
        if (!(event.data instanceof ArrayBuffer)) {
            fail(new TransferError('Received an unexpected message.'));
            return;
        }
        pending = decryptor.open(event.data).then((result) => {
            if (finished) return;
            if (result.kind === 'metadata') {
                handlers.onMetadata(result.metadata);
            } else if (result.kind === 'chunk') {
                parts.push(result.data);
                received += result.data.byteLength;
                handlers.onProgress(received);
            } else {
                finished = true;
                const metadata = decryptor.metadata!;
                handlers.onComplete(
                    new Blob(parts, { type: blobType(metadata.type) }),
                    metadata,
                );
                parts = [];
            }
        }, fail);
    };
    // Messages may still be decrypting when the channel closes.
    channel.onclose = () => {
        void pending.then(() =>
            fail(
                new TransferError(
                    'The sender disconnected before the transfer finished.',
                ),
            ),
        );
    };

    return () => {
        finished = true;
        parts = [];
        channel.close();
    };
}

function blobType(type: string): string {
    return /^[\w.+-]+\/[\w.+-]+$/.test(type) ? type : 'application/octet-stream';
}
