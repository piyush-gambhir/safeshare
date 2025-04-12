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

export async function GET(
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

        const signals = [...channel.signals];
        channel.signals = [];

        return NextResponse.json({
            channelId,
            peerId: channel.peerId,
            signals,
        });
    } catch (error) {
        console.error('Error polling signals:', error);
        return NextResponse.json(
            { error: 'Failed to poll signals' },
            { status: 500 },
        );
    }
}
