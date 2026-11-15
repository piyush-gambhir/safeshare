


export interface PeerSession {
  sessionId: string;
  status: string;

  torrentInfoHash?: string;
  magnetUri?: string;
  peers?: number;
  progress?: number;
  createdAt: number;
  expiresAt: number;
}
