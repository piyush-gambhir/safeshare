import SimplePeer from "simple-peer";
import type { Instance } from "simple-peer";
import { encryptData, decryptData } from "./encryption.js";

interface PeerOptions {
  initiator: boolean;
  trickle: boolean;
  config?: RTCConfiguration;
}

/**
 * Create a WebRTC peer for file transfer
 */
export function createPeer(options: PeerOptions): Instance {
  return new SimplePeer({
    initiator: options.initiator,
    trickle: options.trickle,
    config: options.config || {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    },
  });
}

/**
 * Encrypt and send a file chunk through WebRTC
 */
export async function sendEncryptedChunk(
  peer: Instance,
  chunk: Uint8Array,
  recipientPublicKey: string,
  senderPrivateKey: string,
): Promise<void> {
  const { encrypted, nonce } = await encryptData(
    Buffer.from(chunk),
    recipientPublicKey,
    senderPrivateKey,
  );

  // Prepare a packet that includes nonce and encrypted data
  const nonceLength = Buffer.alloc(2);
  nonceLength.writeUInt16BE(nonce.length, 0);

  // Combine all buffers into one packet
  const packet = Buffer.concat([nonceLength, nonce, encrypted]);

  // Send the packet through WebRTC data channel
  peer.send(packet);
}

/**
 * Receive and decrypt a file chunk from WebRTC
 */
export async function receiveEncryptedChunk(
  data: Uint8Array,
  senderPublicKey: string,
  recipientPrivateKey: string,
): Promise<Buffer> {
  const buffer = Buffer.from(data);

  // Extract nonce length from the first 2 bytes
  const nonceLength = buffer.readUInt16BE(0);

  // Extract nonce and encrypted data
  const nonce = buffer.slice(2, 2 + nonceLength);
  const encryptedData = buffer.slice(2 + nonceLength);

  // Decrypt the data
  return await decryptData(
    encryptedData,
    nonce,
    senderPublicKey,
    recipientPrivateKey,
  );
}
