// End-to-end encryption for a SafeShare transfer, using only WebCrypto.
//
// The sender generates a fresh AES-GCM-256 key per transfer and puts it in the
// share link's URL fragment (`#k=<base64url>`), which browsers never send to a
// server. Every data-channel message is sealed with that key:
//
//   message = version (1 byte) || type (1 byte) || iv (12 bytes) || ciphertext+tag
//   iv      = random 4-byte prefix per sender || 8-byte big-endian sequence number
//   aad     = "safeshare" || version || type || sequence (8 bytes) || transfer ID
//
// Sequence numbers run 0 (metadata), 1..n (chunks), n + 1 (end). The receiver
// computes the AAD from the sequence number it expects next, so a reordered,
// duplicated, dropped, retyped or spliced message fails authentication. The end
// message carries the chunk count and byte length, so truncation is detected.
//
// Keep this module free of imports: it runs unchanged in browsers and in the
// `node --test` unit tests.

export const PROTOCOL_VERSION = 1;
export const CHUNK_SIZE = 64 * 1024;

export const MessageType = {
    Metadata: 1,
    Chunk: 2,
    End: 3,
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface FileMetadata {
    name: string;
    size: number;
    type: string;
}

export interface TransferSummary {
    chunks: number;
    size: number;
}

export class TransferError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TransferError';
    }
}

const KEY_BYTES = 32;
const IV_BYTES = 12;
const IV_PREFIX_BYTES = 4;
const HEADER_BYTES = 2 + IV_BYTES;
const TAG_BYTES = 16;
const AAD_LABEL = new TextEncoder().encode('safeshare');
const BASE64URL_KEY = /^[A-Za-z0-9_-]{43}$/;
const MAX_NAME_LENGTH = 1024;

// Key handling

export function generateTransferKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
    ]);
}

export async function exportTransferKey(key: CryptoKey): Promise<string> {
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    return toBase64Url(raw);
}

// Imports a key from its base64url form. The result can only decrypt and
// cannot be exported again.
export async function importTransferKey(encoded: string): Promise<CryptoKey> {
    if (!BASE64URL_KEY.test(encoded)) {
        throw new TransferError('The link has a malformed decryption key.');
    }
    const raw = fromBase64Url(encoded);
    if (raw.byteLength !== KEY_BYTES) {
        throw new TransferError('The link has a malformed decryption key.');
    }
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
        'decrypt',
    ]);
}

// Reads the `k` parameter from a URL fragment such as `#k=...`.
export function keyFromFragment(hash: string): string | null {
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    return params.get('k');
}

// Sender

export class TransferEncryptor {
    private readonly key: CryptoKey;
    private readonly transferId: string;
    private readonly ivPrefix: Uint8Array<ArrayBuffer>;
    private sequence = 0;
    private chunks = 0;
    private bytes = 0;
    private ended = false;

    constructor(key: CryptoKey, transferId: string) {
        this.key = key;
        this.transferId = transferId;
        // A fresh prefix per encryptor keeps IVs unique even if a key were reused.
        this.ivPrefix = crypto.getRandomValues(new Uint8Array(IV_PREFIX_BYTES));
    }

    async metadata(metadata: FileMetadata): Promise<ArrayBuffer> {
        if (this.sequence !== 0) {
            throw new TransferError('Metadata must be the first message.');
        }
        return this.seal(MessageType.Metadata, encodeJson(metadata));
    }

    async chunk(data: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
        if (this.sequence === 0 || this.ended) {
            throw new TransferError('Chunks must follow metadata and precede the end.');
        }
        this.chunks += 1;
        this.bytes += data.byteLength;
        return this.seal(MessageType.Chunk, data);
    }

    async end(): Promise<ArrayBuffer> {
        if (this.sequence === 0 || this.ended) {
            throw new TransferError('The end message must come last, once.');
        }
        this.ended = true;
        const summary: TransferSummary = { chunks: this.chunks, size: this.bytes };
        return this.seal(MessageType.End, encodeJson(summary));
    }

    private async seal(
        type: MessageType,
        plaintext: Uint8Array<ArrayBuffer>,
    ): Promise<ArrayBuffer> {
        const sequence = this.sequence;
        this.sequence += 1;

        const iv = new Uint8Array(IV_BYTES);
        iv.set(this.ivPrefix, 0);
        new DataView(iv.buffer).setBigUint64(IV_PREFIX_BYTES, BigInt(sequence));

        const ciphertext = new Uint8Array(
            await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv,
                    additionalData: buildAad(type, sequence, this.transferId),
                },
                this.key,
                plaintext,
            ),
        );

        const message = new Uint8Array(HEADER_BYTES + ciphertext.byteLength);
        message[0] = PROTOCOL_VERSION;
        message[1] = type;
        message.set(iv, 2);
        message.set(ciphertext, HEADER_BYTES);
        return message.buffer;
    }
}

// Receiver

export type ReceivedMessage =
    | { kind: 'metadata'; metadata: FileMetadata }
    | { kind: 'chunk'; data: ArrayBuffer }
    | { kind: 'end'; summary: TransferSummary };

// Decrypts messages strictly in order. Any failure is final: callers must
// discard everything received so far.
export class TransferDecryptor {
    private readonly key: CryptoKey;
    private readonly transferId: string;
    private sequence = 0;
    private chunks = 0;
    private bytes = 0;
    private fileMetadata: FileMetadata | null = null;
    private state: 'metadata' | 'chunks' | 'done' | 'failed' = 'metadata';
    private pending: Promise<unknown> = Promise.resolve();

    constructor(key: CryptoKey, transferId: string) {
        this.key = key;
        this.transferId = transferId;
    }

    get done(): boolean {
        return this.state === 'done';
    }

    get metadata(): FileMetadata | null {
        return this.fileMetadata;
    }

    // Calls are queued, so data-channel messages can be passed in as they arrive.
    open(message: ArrayBuffer): Promise<ReceivedMessage> {
        const result = this.pending.then(() => this.openNext(message));
        this.pending = result.catch(() => undefined);
        return result;
    }

    private async openNext(message: ArrayBuffer): Promise<ReceivedMessage> {
        if (this.state === 'done' || this.state === 'failed') {
            throw new TransferError('Unexpected data after the transfer ended.');
        }
        try {
            return await this.openInOrder(message);
        } catch (error) {
            this.state = 'failed';
            throw error instanceof TransferError
                ? error
                : new TransferError('The transfer could not be decrypted.');
        }
    }

    private async openInOrder(message: ArrayBuffer): Promise<ReceivedMessage> {
        const bytes = new Uint8Array(message);
        if (bytes.byteLength < HEADER_BYTES + TAG_BYTES) {
            throw new TransferError('Received a truncated message.');
        }
        if (bytes[0] !== PROTOCOL_VERSION) {
            throw new TransferError('Unsupported transfer protocol version.');
        }
        const type = bytes[1];
        const expected =
            this.state === 'metadata'
                ? [MessageType.Metadata]
                : [MessageType.Chunk, MessageType.End];
        if (!(expected as number[]).includes(type)) {
            throw new TransferError('Received a message out of order.');
        }

        const plaintext = await this.decrypt(
            type as MessageType,
            bytes.slice(2, HEADER_BYTES),
            bytes.slice(HEADER_BYTES),
        );
        this.sequence += 1;

        if (type === MessageType.Metadata) {
            this.fileMetadata = parseMetadata(plaintext);
            this.state = 'chunks';
            return { kind: 'metadata', metadata: this.fileMetadata };
        }

        const metadata = this.fileMetadata!;
        if (type === MessageType.Chunk) {
            this.chunks += 1;
            this.bytes += plaintext.byteLength;
            if (this.bytes > metadata.size) {
                throw new TransferError('Received more data than the sender announced.');
            }
            return { kind: 'chunk', data: plaintext.buffer };
        }

        const summary = parseSummary(plaintext);
        if (
            summary.chunks !== this.chunks ||
            summary.size !== this.bytes ||
            summary.size !== metadata.size
        ) {
            throw new TransferError('The transfer is incomplete.');
        }
        this.state = 'done';
        return { kind: 'end', summary };
    }

    private async decrypt(
        type: MessageType,
        iv: Uint8Array<ArrayBuffer>,
        ciphertext: Uint8Array<ArrayBuffer>,
    ): Promise<Uint8Array<ArrayBuffer>> {
        try {
            return new Uint8Array(
                await crypto.subtle.decrypt(
                    {
                        name: 'AES-GCM',
                        iv,
                        additionalData: buildAad(
                            type,
                            this.sequence,
                            this.transferId,
                        ),
                    },
                    this.key,
                    ciphertext,
                ),
            );
        } catch {
            throw new TransferError(
                'Decryption failed: the data was altered or the key is wrong.',
            );
        }
    }
}

// Helpers

function buildAad(
    type: MessageType,
    sequence: number,
    transferId: string,
): Uint8Array<ArrayBuffer> {
    const id = new TextEncoder().encode(transferId);
    const aad = new Uint8Array(AAD_LABEL.byteLength + 2 + 8 + id.byteLength);
    aad.set(AAD_LABEL, 0);
    let offset = AAD_LABEL.byteLength;
    aad[offset++] = PROTOCOL_VERSION;
    aad[offset++] = type;
    new DataView(aad.buffer).setBigUint64(offset, BigInt(sequence));
    aad.set(id, offset + 8);
    return aad;
}

function encodeJson(value: unknown): Uint8Array<ArrayBuffer> {
    return new TextEncoder().encode(JSON.stringify(value));
}

function decodeJson(bytes: Uint8Array<ArrayBuffer>): unknown {
    try {
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
        throw new TransferError('Received an unreadable control message.');
    }
}

function isSize(value: unknown): value is number {
    return Number.isSafeInteger(value) && (value as number) >= 0;
}

function parseMetadata(bytes: Uint8Array<ArrayBuffer>): FileMetadata {
    const value = decodeJson(bytes) as Partial<FileMetadata> | null;
    if (
        !value ||
        typeof value.name !== 'string' ||
        value.name.length === 0 ||
        value.name.length > MAX_NAME_LENGTH ||
        typeof value.type !== 'string' ||
        !isSize(value.size)
    ) {
        throw new TransferError('Received invalid file metadata.');
    }
    return { name: value.name, size: value.size, type: value.type };
}

function parseSummary(bytes: Uint8Array<ArrayBuffer>): TransferSummary {
    const value = decodeJson(bytes) as Partial<TransferSummary> | null;
    if (!value || !isSize(value.chunks) || !isSize(value.size)) {
        throw new TransferError('Received an invalid end message.');
    }
    return { chunks: value.chunks, size: value.size };
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
