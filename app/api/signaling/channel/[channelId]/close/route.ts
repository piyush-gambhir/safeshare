import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for channels (shared with other routes)
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

export async function POST(request: NextRequest, { params }: { params: { channelId: string } }) {
  try {
    const { channelId } = params

    channels.delete(channelId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error closing channel:", error)
    return NextResponse.json({ error: "Failed to close channel" }, { status: 500 })
  }
}
