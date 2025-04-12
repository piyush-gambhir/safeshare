// Simple in-memory store for signaling channels and signals
// NOTE: This is not suitable for production environments with multiple server instances.
// For production, use a database or an external store like Redis.
import type { SignalData } from './signaling-service';

interface Channel {
    id: string;
    creatorPeerId: string | null; // ID of the peer who created the channel
    joiningPeerId: string | null; // ID of the peer who joined the channel
    signals: { [peerId: string]: SignalData[] }; // Signals waiting for each peer
    createdAt: number;
}

// Use a Map to store channels, keyed by channelId
const channels = new Map<string, Channel>();

const generateId = () => Math.random().toString(36).substring(2, 9);

// Function to create a new channel
export const createChannel = (): string => {
    const channelId = generateId();
    const newChannel: Channel = {
        id: channelId,
        creatorPeerId: null, // Will be set when creator polls/sends first signal? Or maybe assign peerId on creation?
        joiningPeerId: null,
        signals: {},
        createdAt: Date.now(),
    };
    channels.set(channelId, newChannel);
    console.log(`Channel created: ${channelId}`);
    // Clean up old channels periodically (optional)
    cleanupOldChannels();
    return channelId;
};

// Function to get a channel
export const getChannel = (channelId: string): Channel | undefined => {
    return channels.get(channelId);
};

// Function for a peer to join a channel
export const joinChannel = (
    channelId: string,
): { peerId: string | null; error?: string; status?: number } => {
    const channel = channels.get(channelId);
    if (!channel) {
        return { peerId: null, error: 'Channel not found', status: 404 };
    }
    if (channel.joiningPeerId) {
        // Allow rejoining? For now, assume only one joiner.
        // Or handle multiple peers if needed.
        // return { peerId: null, error: 'Channel already full', status: 400 };
    }
    // Assign a unique ID to the joining peer (could be passed from client)
    const joiningPeerId = generateId();
    channel.joiningPeerId = joiningPeerId;
    channel.signals[joiningPeerId] = []; // Initialize signal queue for joiner
    console.log(`Peer ${joiningPeerId} joined channel ${channelId}`);
    // Notify creator? (Could add a signal for the creator)
    return { peerId: joiningPeerId };
};

// Function to add a signal to a channel for the *other* peer
export const addSignal = (
    channelId: string,
    senderPeerId: string,
    signal: SignalData,
): { success: boolean; error?: string; status?: number } => {
    const channel = channels.get(channelId);
    if (!channel) {
        return { success: false, error: 'Channel not found', status: 404 };
    }

    let recipientPeerId: string | null = null;
    if (channel.creatorPeerId === senderPeerId && channel.joiningPeerId) {
        recipientPeerId = channel.joiningPeerId;
    } else if (
        channel.joiningPeerId === senderPeerId &&
        channel.creatorPeerId
    ) {
        recipientPeerId = channel.creatorPeerId;
    } else if (!channel.creatorPeerId && !channel.joiningPeerId) {
        // First peer connecting - assume creator
        channel.creatorPeerId = senderPeerId;
        channel.signals[senderPeerId] = []; // Initialize signal queue for creator
        console.log(
            `Peer ${senderPeerId} registered as creator for channel ${channelId}`,
        );
        // No recipient yet, maybe store signal temporarily or wait for joiner?
        // For simplicity, let's assume join happens before signals are sent,
        // or client handles retries. Or we could queue signals for the 'other' peer even if unknown.
        return { success: true }; // Acknowledge signal received, even if no recipient yet
    } else if (!recipientPeerId) {
        // This handles case where one peer exists but the sender is unknown, or recipient is not yet known/joined
        console.warn(
            `Channel ${channelId}: Cannot determine recipient for signal from ${senderPeerId}. Creator: ${channel.creatorPeerId}, Joiner: ${channel.joiningPeerId}`,
        );
        // Decide how to handle: error, queue, ignore? Let's ignore for now.
        return {
            success: false,
            error: 'Recipient peer not found or not connected',
            status: 400,
        };
    }

    if (!channel.signals[recipientPeerId]) {
        channel.signals[recipientPeerId] = [];
    }
    channel.signals[recipientPeerId].push(signal);
    console.log(
        `Signal added for peer ${recipientPeerId} in channel ${channelId}`,
    );
    return { success: true };
};

// Function to retrieve and clear signals for a specific peer in a channel
export const getSignals = (
    channelId: string,
    recipientPeerId: string,
): {
    signals: SignalData[];
    peerId?: string | null;
    error?: string;
    status?: number;
} => {
    const channel = channels.get(channelId);
    if (!channel) {
        return { signals: [], error: 'Channel not found', status: 404 };
    }

    // If this is the first poll from the creator, register them
    if (!channel.creatorPeerId && !channel.joiningPeerId) {
        channel.creatorPeerId = recipientPeerId;
        channel.signals[recipientPeerId] = [];
        console.log(
            `Peer ${recipientPeerId} registered as creator via polling channel ${channelId}`,
        );
    }

    const signals = channel.signals[recipientPeerId] || [];
    channel.signals[recipientPeerId] = []; // Clear signals after retrieval

    // Determine the other peer's ID to send back to the client
    let otherPeerId: string | null = null;
    if (channel.creatorPeerId === recipientPeerId) {
        otherPeerId = channel.joiningPeerId;
    } else if (channel.joiningPeerId === recipientPeerId) {
        otherPeerId = channel.creatorPeerId;
    }

    console.log(
        `Retrieved ${signals.length} signals for peer ${recipientPeerId} in channel ${channelId}. Other peer: ${otherPeerId}`,
    );
    return { signals, peerId: otherPeerId }; // Return the other peer's ID
};

// Function to close/delete a channel
export const closeChannel = (channelId: string): void => {
    if (channels.has(channelId)) {
        channels.delete(channelId);
        console.log(`Channel closed: ${channelId}`);
    }
};

// Optional: Simple cleanup for channels older than 1 hour
const cleanupOldChannels = () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    channels.forEach((channel, channelId) => {
        if (now - channel.createdAt > oneHour) {
            channels.delete(channelId);
            console.log(`Cleaned up old channel: ${channelId}`);
        }
    });
};

// Periodically run cleanup (e.g., every 10 minutes)
// Note: In serverless, this might not run reliably. A proper cron job or external cleanup mechanism is better.
// setInterval(cleanupOldChannels, 10 * 60 * 1000);
