const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

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

// Initiate a new file sharing session
export const initiateShare = async (
    fileMetadata: FileMetadata,
): Promise<InitiateShareResponse> => {
    const response = await fetch(`${API_BASE_URL}/share/initiate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileMetadata }),
    });

    if (!response.ok) {
        throw new Error('Failed to initiate share');
    }

    return response.json();
};

// Update torrent information
export const updateTorrent = async (
    sessionId: string,
    torrentInfoHash: string,
    magnetUri: string,
): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/share/update-torrent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, torrentInfoHash, magnetUri }),
    });

    if (!response.ok) {
        throw new Error('Failed to update torrent');
    }

    return response.json();
};

// Get session information
export const getSessionInfo = async (
    sessionId: string,
): Promise<SessionInfo> => {
    const response = await fetch(`${API_BASE_URL}/share/session/${sessionId}`);

    if (!response.ok) {
        throw new Error('Failed to get session info');
    }

    return response.json();
};

// Update session status
export const updateStatus = async (
    sessionId: string,
    status: 'initiated' | 'ready' | 'connected' | 'completed' | 'error',
    peers?: number,
    progress?: number,
): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/share/update-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, status, peers, progress }),
    });

    if (!response.ok) {
        throw new Error('Failed to update status');
    }

    return response.json();
};
