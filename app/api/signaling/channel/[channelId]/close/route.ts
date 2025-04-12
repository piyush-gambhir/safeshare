import { NextRequest, NextResponse } from 'next/server';

import { closeChannel } from '@/lib/channel-store';

// Updated import

export async function POST(
    request: NextRequest,
    { params }: { params: { channelId: string } }, // Specify type for params
) {
    const { channelId } = params;

    closeChannel(channelId); // Use imported function

    return NextResponse.json({ success: true });
}
