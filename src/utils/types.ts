export interface TorrentInfo {
  infoHash: string;
  magnetUri: string;
  files: {
    name: string;
    size: number;
    type: string;
  }[];
}

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
}

export interface PeerSession {
  sessionId: string;
  publicKey: string;
  privateKey: string;
  torrentInfoHash: string;
  magnetUri?: string;
  fileMetadata: {
    name: string;
    size: number;
    type: string;
  };
  status: string;
  peers?: number;
  progress?: number;
  createdAt: number;
  expiresAt: number;
}
