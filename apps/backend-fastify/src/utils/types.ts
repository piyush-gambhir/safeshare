// A transfer session as stored in Redis. The web client keeps file metadata and
// keys out of it: the server only relays the WebRTC offer and answer, which are
// stored under their own keys (see fileShare.controller.ts).
export interface PeerSession {
  sessionId: string;
  status: string;
  // Set by the desktop client, which shares a WebTorrent magnet URI instead of SDP.
  torrentInfoHash?: string;
  magnetUri?: string;
  peers?: number;
  progress?: number;
  createdAt: number;
  expiresAt: number;
}
