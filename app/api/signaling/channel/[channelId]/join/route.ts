import { randomUUID } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';

// In-memory storage for channels (shared with other routes)
const channels = new Map<
    string,
    {
        id: string;
        peerId: string | null;
        signals: any[];
        created: number;
        expires: number;
    }
>();

export async function POST(
    request: NextRequest,
    { params }: { params: { channelId: string } },
) {
    try {
        const { channelId } = params;

        const channel = channels.get(channelId);

        if (!channel) {
            return NextResponse.json(
                { error: 'Channel not found' },
                { status: 404 },
            );
        }

        if (channel.peerId) {
            return NextResponse.json(
                { error: 'Channel already has a peer' },
                { status: 409 },
            );
        }

        const peerId = randomUUID();
        channel.peerId = peerId;

        return NextResponse.json({
            channelId,
            peerId,
        });
    } catch (error) {
        console.error('Error joining channel:', error);
        return NextResponse.json(
            { error: 'Failed to join channel' },
            { status: 500 },
        );
    }
}
