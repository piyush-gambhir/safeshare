import { NextRequest, NextResponse } from 'next/server';

import { createChannel } from '@/lib/channel-store';

// Updated import

export async function POST(request: NextRequest) {
    try {
        const channelId = createChannel(); // Use imported function
        return NextResponse.json({ id: channelId }); // Return id property as expected by SignalingService
    } catch (error) {
        console.error('Error creating channel:', error);
        return NextResponse.json(
            { message: 'Failed to create channel' },
            { status: 500 },
        );
    }
}
