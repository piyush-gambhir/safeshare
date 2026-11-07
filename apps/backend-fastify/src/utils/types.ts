// A transfer session as stored in Redis. The web client keeps file metadata and
// keys out of it: the server only relays the WebRTC offer and answer.
export interface PeerSession {
  sessionId: string;
  status: string;
  offer?: string;
  answer?: string;
  // Set by the desktop client, which shares a WebTorrent magnet URI instead of SDP.
  torrentInfoHash?: string;
  magnetUri?: string;
  peers?: number;
  progress?: number;
  createdAt: number;
  expiresAt: number;
}
