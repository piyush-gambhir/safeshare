import crypto from "crypto";

/**
 * Generate a unique session ID based on browser fingerprint and timestamp
 */
export function generateSessionId(browserInfo: string, ipHash: string): string {
  const timestamp = Date.now().toString();
  const hash = crypto
    .createHash("sha256")
    .update(browserInfo + timestamp + ipHash)
    .digest("hex")
    .slice(0, 16);

  return hash;
}

/**
 * Create a placeholder torrent info hash
 */
export function createTorrentInfoHash(
  sessionId: string,
  fileName: string,
): string {
  return crypto
    .createHash("sha1")
    .update(`${sessionId}:${fileName}:${Date.now()}`)
    .digest("hex");
}

/**
 * Generate a nonce for encryption
 */
export function generateNonce(): Uint8Array {
  return crypto.randomBytes(24);
}
