import { NextRequest, NextResponse } from 'next/server';

import { addSignal } from '@/lib/channel-store';
// Updated import
import type { SignalData } from '@/lib/signaling-service';

// Import SignalData type from correct location

export async function POST(
    request: NextRequest,
    { params }: { params: { channelId: string } },
) {
    const { channelId } = params;
    // Assuming the client sends a peerId in the header or body to identify itself
    const senderPeerId = request.headers.get('X-Peer-ID'); // Example: Get peer ID from header

    if (!senderPeerId) {
        return NextResponse.json(
            { error: 'Sender Peer ID missing' },
            { status: 400 },
        );
    }

    try {
        const signal = (await request.json()) as SignalData; // Type assertion
        const result = addSignal(channelId, senderPeerId, signal); // Use imported function

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: result.status },
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending signal:', error);
        return NextResponse.json(
            { error: 'Failed to send signal' },
            { status: 500 },
        );
    }
}
