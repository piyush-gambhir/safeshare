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

        const signal = await request.json();
        channel.signals.push(signal);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending signal:', error);
        return NextResponse.json(
            { error: 'Failed to send signal' },
            { status: 500 },
        );
    }
}
