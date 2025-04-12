export interface FileChunk {
  id: number
  data: ArrayBuffer
  size: number
}

export interface FileMetadata {
  name: string
  type: string
  size: number
  totalChunks: number
}

export class FileChunker {
  private static readonly DEFAULT_CHUNK_SIZE = 64 * 1024 // 64KB

  private file: File | null = null
  private chunkSize: number
  private metadata: FileMetadata | null = null

  constructor(chunkSize = FileChunker.DEFAULT_CHUNK_SIZE) {
    this.chunkSize = chunkSize
  }

  public setFile(file: File): void {
    this.file = file
    this.metadata = {
      name: file.name,
      type: file.type,
      size: file.size,
      totalChunks: Math.ceil(file.size / this.chunkSize),
    }
  }

  public getMetadata(): FileMetadata | null {
    return this.metadata
  }

  public async getChunk(chunkId: number): Promise<FileChunk | null> {
    if (!this.file || !this.metadata) {
      return null
    }

    if (chunkId < 0 || chunkId >= this.metadata.totalChunks) {
      return null
    }

    const start = chunkId * this.chunkSize
    const end = Math.min(start + this.chunkSize, this.file.size)

    const blob = this.file.slice(start, end)
    const data = await this.readBlobAsArrayBuffer(blob)

    return {
      id: chunkId,
      data,
      size: end - start,
    }
  }

  public async getAllChunks(): Promise<FileChunk[]> {
    if (!this.file || !this.metadata) {
      return []
    }

    const chunks: FileChunk[] = []

    for (let i = 0; i < this.metadata.totalChunks; i++) {
      const chunk = await this.getChunk(i)
      if (chunk) {
        chunks.push(chunk)
      }
    }

    return chunks
  }

  private readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result)
        } else {
          reject(new Error("Failed to read blob as ArrayBuffer"))
        }
      }

      reader.onerror = () => {
        reject(reader.error)
      }

      reader.readAsArrayBuffer(blob)
    })
  }
}
