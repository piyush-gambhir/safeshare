export interface FileMetadata {
    name: string;
    size: number;
    type: string;
}

export interface InitiateShareResponse {
    sessionId: string;
    publicKey: string;
    torrentInfoHash: string;
    shareableLink: string;
    expiresAt: number;
}

export interface SessionInfo {
    sessionId: string;
    publicKey: string;
    torrentInfoHash: string;
    magnetUri: string;
    fileMetadata: FileMetadata;
    status: string;
    expiresAt: number;
}

export interface UpdateStatusInput {
    sessionId: string;
    status: "initiated" | "ready" | "connected" | "completed" | "error";
    peers?: number;
    progress?: number;
}

export interface UpdateTorrentInput {
    sessionId: string;
    torrentInfoHash: string;
    magnetUri: string;
}

export interface ErrorResponse {
    error: string;
}
