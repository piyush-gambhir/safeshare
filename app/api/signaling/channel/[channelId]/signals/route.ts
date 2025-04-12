import { NextRequest, NextResponse } from 'next/server';

import { getSignals } from '@/lib/channel-store';

// Updated import

export async function GET(
    request: NextRequest,
    { params }: { params: { channelId: string } },
) {
    const { channelId } = params;
    // Assuming the client sends a peerId in the header or body to identify itself
    const recipientPeerId = request.headers.get('X-Peer-ID'); // Example: Get peer ID from header

    if (!recipientPeerId) {
        return NextResponse.json(
            { error: 'Recipient Peer ID missing' },
            { status: 400 },
        );
    }

    const result = getSignals(channelId, recipientPeerId); // Use imported function

    if (result.error) {
        return NextResponse.json(
            { error: result.error },
            { status: result.status },
        );
    }

    // Return signals and the ID of the other peer (if connected)
    return NextResponse.json({
        signals: result.signals,
        peerId: result.peerId, // The ID of the *other* peer in the channel
    });
}
