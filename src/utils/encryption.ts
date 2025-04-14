import * as sodium from "libsodium-wrappers";

/**
 * Encrypt data using libsodium
 */
export async function encryptData(
  data: Buffer | string,
  recipientPublicKey: string,
  senderPrivateKey: string,
): Promise<{ encrypted: Buffer; nonce: Buffer }> {
  await sodium.ready;

  const dataBuffer = typeof data === "string" ? Buffer.from(data) : data;
  const nonce = Buffer.from(
    sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES),
  );
  const publicKeyBuffer = Buffer.from(recipientPublicKey, "hex");
  const privateKeyBuffer = Buffer.from(senderPrivateKey, "hex");

  const encrypted = Buffer.from(
    sodium.crypto_box_easy(
      dataBuffer,
      nonce,
      publicKeyBuffer,
      privateKeyBuffer,
    ),
  );

  return { encrypted, nonce };
}

/**
 * Decrypt data using libsodium
 */
export async function decryptData(
  encryptedData: Buffer,
  nonce: Buffer,
  senderPublicKey: string,
  recipientPrivateKey: string,
): Promise<Buffer> {
  await sodium.ready;

  const publicKeyBuffer = Buffer.from(senderPublicKey, "hex");
  const privateKeyBuffer = Buffer.from(recipientPrivateKey, "hex");

  const decrypted = Buffer.from(
    sodium.crypto_box_open_easy(
      encryptedData,
      nonce,
      publicKeyBuffer,
      privateKeyBuffer,
    ),
  );

  return decrypted;
}
