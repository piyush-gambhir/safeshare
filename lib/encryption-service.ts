export class EncryptionService {
  private static readonly ALGORITHM = "AES-GCM"
  private static readonly KEY_LENGTH = 256 // bits
  private static readonly IV_LENGTH = 12 // bytes

  private key: CryptoKey | null = null

  public async generateKey(): Promise<void> {
    this.key = await window.crypto.subtle.generateKey(
      {
        name: EncryptionService.ALGORITHM,
        length: EncryptionService.KEY_LENGTH,
      },
      true,
      ["encrypt", "decrypt"],
    )
  }

  public async exportKey(): Promise<string> {
    if (!this.key) {
      throw new Error("No encryption key available")
    }

    const exportedKey = await window.crypto.subtle.exportKey("raw", this.key)
    return this.arrayBufferToBase64(exportedKey)
  }

  public async importKey(keyData: string): Promise<void> {
    const keyBuffer = this.base64ToArrayBuffer(keyData)

    this.key = await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: EncryptionService.ALGORITHM,
        length: EncryptionService.KEY_LENGTH,
      },
      true,
      ["encrypt", "decrypt"],
    )
  }

  public async encrypt(data: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.key) {
      throw new Error("No encryption key available")
    }

    // Generate a random IV for each encryption
    const iv = window.crypto.getRandomValues(new Uint8Array(EncryptionService.IV_LENGTH))

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: EncryptionService.ALGORITHM,
        iv,
      },
      this.key,
      data,
    )

    // Prepend the IV to the encrypted data
    const result = new Uint8Array(iv.length + encryptedData.byteLength)
    result.set(iv, 0)
    result.set(new Uint8Array(encryptedData), iv.length)

    return result.buffer
  }

  public async decrypt(data: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.key) {
      throw new Error("No encryption key available")
    }

    // Extract the IV from the beginning of the data
    const iv = new Uint8Array(data, 0, EncryptionService.IV_LENGTH)
    const encryptedData = new Uint8Array(data, EncryptionService.IV_LENGTH)

    return await window.crypto.subtle.decrypt(
      {
        name: EncryptionService.ALGORITHM,
        iv,
      },
      this.key,
      encryptedData,
    )
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }
}
