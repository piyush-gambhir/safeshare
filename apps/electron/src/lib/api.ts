import {
    FileMetadata,
    InitiateShareResponse,
    SessionInfo,
    UpdateStatusInput,
    UpdateTorrentInput,
} from "../types/fileShare";

const API_BASE_URL = "http://localhost:8000/v1";

export const initiateShare = async (
    fileMetadata: FileMetadata
): Promise<InitiateShareResponse> => {
    const response = await fetch(`${API_BASE_URL}/share/initiate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileMetadata }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    return response.json();
};

export const updateTorrent = async (
    input: UpdateTorrentInput
): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/share/update-torrent`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    const result = await response.json();
    return result.success;
};

export const getSessionInfo = async (
    sessionId: string
): Promise<SessionInfo> => {
    const response = await fetch(`${API_BASE_URL}/share/session/${sessionId}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    return response.json();
};

export const updateStatus = async (
    input: UpdateStatusInput
): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/share/update-status`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    const result = await response.json();
    return result.success;
};
