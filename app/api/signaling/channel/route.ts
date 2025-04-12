import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"

// In-memory storage for channels (in a production app, use a database)
const channels = new Map<
  string,
  {
    id: string
    peerId: string | null
    signals: any[]
    created: number
    expires: number
  }
>()

// Clean up expired channels every 5 minutes
setInterval(
  () => {
    const now = Date.now()
    for (const [id, channel] of channels.entries()) {
      if (channel.expires < now) {
        channels.delete(id)
      }
    }
  },
  5 * 60 * 1000,
)

export async function POST(request: NextRequest) {
  try {
    const channelId = randomUUID()
    const now = Date.now()

    // Channel expires after 30 minutes
    const expires = now + 30 * 60 * 1000

    channels.set(channelId, {
      id: channelId,
      peerId: null,
      signals: [],
      created: now,
      expires,
    })

    return NextResponse.json({
      id: channelId,
      created: now,
      expires,
    })
  } catch (error) {
    console.error("Error creating channel:", error)
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 })
  }
}
