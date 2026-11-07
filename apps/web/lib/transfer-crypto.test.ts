import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CHUNK_SIZE,
    MAX_MESSAGE_BYTES,
    TransferDecryptor,
    TransferEncryptor,
    TransferError,
    exportTransferKey,
    generateTransferKey,
    importTransferKey,
    keyFromFragment,
} from './transfer-crypto.ts';

const TRANSFER_ID = '0f1e2d3c4b5a69788796a5b4c3d2e1f0';

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(length);
    for (let offset = 0; offset < length; offset += 65536) {
        crypto.getRandomValues(bytes.subarray(offset, Math.min(length, offset + 65536)));
    }
    return bytes;
}

// Encrypts `file` the way the web client does and returns every message in order.
async function sealFile(
    key: CryptoKey,
    file: Uint8Array<ArrayBuffer>,
    transferId = TRANSFER_ID,
): Promise<ArrayBuffer[]> {
    const encryptor = new TransferEncryptor(key, transferId);
    const messages = [
        await encryptor.metadata({
            name: 'quarterly-report.pdf',
            size: file.byteLength,
            type: 'application/pdf',
        }),
    ];
    for (let offset = 0; offset < file.byteLength; offset += CHUNK_SIZE) {
        messages.push(await encryptor.chunk(file.slice(offset, offset + CHUNK_SIZE)));
    }
    messages.push(await encryptor.end());
    return messages;
}

async function openAll(
    key: CryptoKey,
    messages: ArrayBuffer[],
    transferId = TRANSFER_ID,
): Promise<{ decryptor: TransferDecryptor; bytes: Uint8Array }> {
    const decryptor = new TransferDecryptor(key, transferId);
    const parts: Uint8Array[] = [];
    for (const message of messages) {
        const result = await decryptor.open(message);
        if (result.kind === 'chunk') parts.push(new Uint8Array(result.data));
    }
    const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
    let offset = 0;
    for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
    }
    return { decryptor, bytes };
}

async function receiverKey(key: CryptoKey): Promise<CryptoKey> {
    return importTransferKey(await exportTransferKey(key));
}

test('round trip restores metadata and bytes across several chunks', async () => {
    const key = await generateTransferKey();
    const file = randomBytes(CHUNK_SIZE * 3 + 1234);
    const messages = await sealFile(key, file);
    assert.equal(messages.length, 1 + 4 + 1);

    const { decryptor, bytes } = await openAll(await receiverKey(key), messages);
    assert.equal(decryptor.done, true);
    assert.deepEqual(decryptor.metadata, {
        name: 'quarterly-report.pdf',
        size: file.byteLength,
        type: 'application/pdf',
    });
    assert.deepEqual(bytes, file);
});

test('every message fits the 64 KiB interoperable SCTP message size', async () => {
    const key = await generateTransferKey();
    const messages = await sealFile(key, randomBytes(CHUNK_SIZE * 2));
    assert.equal(messages[1].byteLength, MAX_MESSAGE_BYTES);
    assert.ok(messages.every((message) => message.byteLength <= MAX_MESSAGE_BYTES));
});

test('an empty file round trips', async () => {
    const key = await generateTransferKey();
    const { decryptor, bytes } = await openAll(
        await receiverKey(key),
        await sealFile(key, new Uint8Array(0)),
    );
    assert.equal(decryptor.done, true);
    assert.equal(bytes.byteLength, 0);
});

test('IVs never repeat within a transfer or across encryptors', async () => {
    const key = await generateTransferKey();
    const ivs = new Set<string>();
    for (let run = 0; run < 2; run++) {
        for (const message of await sealFile(key, randomBytes(CHUNK_SIZE * 2))) {
            ivs.add(Buffer.from(new Uint8Array(message, 2, 12)).toString('hex'));
        }
    }
    assert.equal(ivs.size, 2 * 4);
});

test('a wrong key fails on the first message', async () => {
    const messages = await sealFile(await generateTransferKey(), randomBytes(100));
    const wrong = await receiverKey(await generateTransferKey());
    await assert.rejects(openAll(wrong, messages), TransferError);
});

test('tampered ciphertext fails', async () => {
    const key = await generateTransferKey();
    const messages = await sealFile(key, randomBytes(CHUNK_SIZE * 2));
    const tampered = new Uint8Array(messages[1].slice(0));
    tampered[tampered.byteLength - 20] ^= 0x01;
    messages[1] = tampered.buffer;
    await assert.rejects(openAll(await receiverKey(key), messages), /Decryption failed/);
});

test('a tampered IV or message type fails', async () => {
    const key = await generateTransferKey();
    const rkey = await receiverKey(key);

    const ivTampered = await sealFile(key, randomBytes(10));
    new Uint8Array(ivTampered[1])[2] ^= 0x01;
    await assert.rejects(openAll(rkey, ivTampered), TransferError);

    // Relabel the last chunk as the end message: the type is bound in the AAD.
    const retyped = await sealFile(key, randomBytes(10));
    new Uint8Array(retyped[1])[1] = 3;
    await assert.rejects(openAll(rkey, retyped), TransferError);
});

test('reordered chunks fail', async () => {
    const key = await generateTransferKey();
    const messages = await sealFile(key, randomBytes(CHUNK_SIZE * 3));
    [messages[1], messages[2]] = [messages[2], messages[1]];
    await assert.rejects(openAll(await receiverKey(key), messages), /Decryption failed/);
});

test('a duplicated chunk fails', async () => {
    const key = await generateTransferKey();
    const messages = await sealFile(key, randomBytes(CHUNK_SIZE * 3));
    messages.splice(2, 0, messages[1]);
    await assert.rejects(openAll(await receiverKey(key), messages), /Decryption failed/);
});

test('a chunk spliced from another transfer under the same key fails', async () => {
    const key = await generateTransferKey();
    const messages = await sealFile(key, randomBytes(CHUNK_SIZE * 2));
    const other = await sealFile(key, randomBytes(CHUNK_SIZE * 2), 'another-transfer');
    messages[1] = other[1];
    await assert.rejects(openAll(await receiverKey(key), messages), /Decryption failed/);
});

test('truncation is detected', async () => {
    const key = await generateTransferKey();
    const rkey = await receiverKey(key);
    const messages = await sealFile(key, randomBytes(CHUNK_SIZE * 3));

    // Dropping a chunk shifts the end message to an unexpected position.
    const dropped = [...messages.slice(0, 3), messages[messages.length - 1]];
    await assert.rejects(openAll(rkey, dropped), TransferError);

    // A stream cut off before the end message never completes.
    const { decryptor } = await openAll(rkey, messages.slice(0, -1));
    assert.equal(decryptor.done, false);
});

test('an end message that disagrees with the metadata fails', async () => {
    const key = await generateTransferKey();
    const encryptor = new TransferEncryptor(key, TRANSFER_ID);
    const messages = [
        await encryptor.metadata({ name: 'a.bin', size: 20, type: '' }),
        await encryptor.chunk(randomBytes(10)),
        await encryptor.end(),
    ];
    await assert.rejects(openAll(await receiverKey(key), messages), /incomplete/);
});

test('the decryptor refuses input after a failure or after the end', async () => {
    const key = await generateTransferKey();
    const rkey = await receiverKey(key);
    const messages = await sealFile(key, randomBytes(10));

    const failed = new TransferDecryptor(rkey, TRANSFER_ID);
    await assert.rejects(failed.open(messages[1]), /out of order/);
    await assert.rejects(failed.open(messages[0]), TransferError);

    const { decryptor } = await openAll(rkey, messages);
    await assert.rejects(decryptor.open(messages[1]), /after the transfer ended/);
});

test('keys survive the base64url fragment round trip', async () => {
    const key = await generateTransferKey();
    const encoded = await exportTransferKey(key);
    assert.match(encoded, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(keyFromFragment(`#k=${encoded}`), encoded);
    assert.equal(keyFromFragment(`k=${encoded}`), encoded);
    assert.equal(keyFromFragment(''), null);
    assert.equal(keyFromFragment('#x=1'), null);

    const imported = await importTransferKey(encoded);
    assert.equal(imported.extractable, false);
    assert.deepEqual(imported.usages, ['decrypt']);
});

test('malformed keys are rejected', async () => {
    const encoded = await exportTransferKey(await generateTransferKey());
    for (const bad of ['', encoded.slice(1), `${encoded}A`, `${encoded.slice(0, -1)}=`, `${encoded.slice(0, -1)}+`]) {
        await assert.rejects(importTransferKey(bad), /malformed/);
    }
});
