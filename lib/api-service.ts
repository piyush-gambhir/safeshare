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
    magnetUri?: string;
    fileMetadata: FileMetadata;
    status: string;
    expiresAt: number;
}

class ApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl =
            process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/v1';
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const error = await response
                .json()
                .catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || 'API request failed');
        }
        return response.json();
    }

    async initiateFileShare(
        fileMetadata: FileMetadata,
    ): Promise<InitiateShareResponse> {
        const response = await fetch(`${this.baseUrl}/share/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileMetadata }),
        });
        return this.handleResponse<InitiateShareResponse>(response);
    }

    async getSessionInfo(sessionId: string): Promise<SessionInfo> {
        const response = await fetch(
            `${this.baseUrl}/share/session/${sessionId}`,
        );
        return this.handleResponse<SessionInfo>(response);
    }

    async updateTorrent(
        sessionId: string,
        torrentInfoHash: string,
        magnetUri: string,
    ): Promise<{ success: boolean }> {
        const response = await fetch(`${this.baseUrl}/share/update-torrent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId, torrentInfoHash, magnetUri }),
        });
        return this.handleResponse<{ success: boolean }>(response);
    }

    async updateStatus(
        sessionId: string,
        status: 'initiated' | 'ready' | 'connected' | 'completed' | 'error',
        peers?: number,
        progress?: number,
    ): Promise<{ success: boolean }> {
        const response = await fetch(`${this.baseUrl}/share/update-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId, status, peers, progress }),
        });
        return this.handleResponse<{ success: boolean }>(response);
    }
}

export const apiService = new ApiService();
