// Client for the signaling API. It only ever carries a session ID and the
// WebRTC offer and answer: no file metadata and no keys.
import { TransferError } from '@/lib/transfer-crypto';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

export interface CreatedSession {
    sessionId: string;
    expiresAt: number;
}

export interface SessionSignals {
    sessionId: string;
    status: string;
    offer?: string;
    answer?: string;
    expiresAt: number;
}

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number) {
        super(`Signaling request failed with status ${status}`);
        this.name = 'ApiError';
        this.status = status;
    }
}

export class NetworkError extends Error {
    constructor() {
        super('Could not reach the signaling server.');
        this.name = 'NetworkError';
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, init);
    } catch (error) {
        if (init?.signal?.aborted) throw error;
        throw new NetworkError();
    }
    if (!response.ok) throw new ApiError(response.status);
    return response.json();
}

function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export function createSession(): Promise<CreatedSession> {
    return post('/share/initiate', {});
}

export function getSession(
    sessionId: string,
    signal?: AbortSignal,
): Promise<SessionSignals> {
    return request(`/share/session/${encodeURIComponent(sessionId)}`, {
        cache: 'no-store',
        signal,
    });
}

export function postSignal(
    sessionId: string,
    type: 'offer' | 'answer',
    sdp: string,
): Promise<{ success: boolean }> {
    return post('/share/signal', { sessionId, type, sdp });
}

export function describeError(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 404) {
            return 'This link has expired or does not exist.';
        }
        if (error.status === 409) {
            return 'This link has already been used. Ask the sender for a new one.';
        }
        return 'The signaling server returned an error. Try again.';
    }
    if (error instanceof TransferError || error instanceof NetworkError) {
        return error.message;
    }
    return error instanceof Error ? error.message : 'Something went wrong.';
}
