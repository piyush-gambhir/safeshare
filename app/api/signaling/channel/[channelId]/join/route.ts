import { NextRequest, NextResponse } from 'next/server';

import { joinChannel } from '@/lib/channel-store';

// Updated import

export async function POST(
    request: NextRequest,
    { params }: { params: { channelId: string } }, // Specify type for params
) {
    const { channelId } = params;

    try {
        const response = joinChannel(channelId); // Use imported function

        if (response.error) {
            return NextResponse.json(response, { status: response.status });
        }

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error joining channel:', error);
        return NextResponse.json(
            { error: 'Failed to join channel' },
            { status: 500 },
        );
    }
}
