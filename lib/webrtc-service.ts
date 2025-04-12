export type PeerConnectionState = "new" | "connecting" | "connected" | "disconnected" | "failed" | "closed"

export type DataChannelState = "connecting" | "open" | "closing" | "closed"

export interface SignalData {
  type: "offer" | "answer" | "ice-candidate"
  payload: any
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private onConnectionStateChangeCallback: ((state: PeerConnectionState) => void) | null = null
  private onDataChannelStateChangeCallback: ((state: DataChannelState) => void) | null = null
  private onDataReceivedCallback: ((data: ArrayBuffer) => void) | null = null
  private onSignalCallback: ((signal: SignalData) => void) | null = null

  constructor() {
    this.initializePeerConnection()
  }

  private initializePeerConnection() {
    const config: RTCConfiguration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    }

    this.peerConnection = new RTCPeerConnection(config)

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onSignalCallback) {
        this.onSignalCallback({
          type: "ice-candidate",
          payload: event.candidate,
        })
      }
    }

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(this.peerConnection.connectionState as PeerConnectionState)
      }
    }

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel
      this.setupDataChannel()
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) return

    this.dataChannel.binaryType = "arraybuffer"

    this.dataChannel.onopen = () => {
      if (this.onDataChannelStateChangeCallback) {
        this.onDataChannelStateChangeCallback("open")
      }
    }

    this.dataChannel.onclose = () => {
      if (this.onDataChannelStateChangeCallback) {
        this.onDataChannelStateChangeCallback("closed")
      }
    }

    this.dataChannel.onmessage = (event) => {
      if (this.onDataReceivedCallback) {
        this.onDataReceivedCallback(event.data)
      }
    }
  }

  public async createOffer(): Promise<void> {
    if (!this.peerConnection) return

    this.dataChannel = this.peerConnection.createDataChannel("file-transfer", {
      ordered: true,
    })
    this.setupDataChannel()

    try {
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      if (this.onSignalCallback) {
        this.onSignalCallback({
          type: "offer",
          payload: offer,
        })
      }
    } catch (error) {
      console.error("Error creating offer:", error)
    }
  }

  public async handleSignal(signal: SignalData): Promise<void> {
    if (!this.peerConnection) return

    try {
      if (signal.type === "offer") {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload))
        const answer = await this.peerConnection.createAnswer()
        await this.peerConnection.setLocalDescription(answer)

        if (this.onSignalCallback) {
          this.onSignalCallback({
            type: "answer",
            payload: answer,
          })
        }
      } else if (signal.type === "answer") {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload))
      } else if (signal.type === "ice-candidate") {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.payload))
      }
    } catch (error) {
      console.error("Error handling signal:", error)
    }
  }

  public sendData(data: ArrayBuffer): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      return false
    }

    try {
      this.dataChannel.send(data)
      return true
    } catch (error) {
      console.error("Error sending data:", error)
      return false
    }
  }

  public onConnectionStateChange(callback: (state: PeerConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback
  }

  public onDataChannelStateChange(callback: (state: DataChannelState) => void): void {
    this.onDataChannelStateChangeCallback = callback
  }

  public onDataReceived(callback: (data: ArrayBuffer) => void): void {
    this.onDataReceivedCallback = callback
  }

  public onSignal(callback: (signal: SignalData) => void): void {
    this.onSignalCallback = callback
  }

  public close(): void {
    if (this.dataChannel) {
      this.dataChannel.close()
    }

    if (this.peerConnection) {
      this.peerConnection.close()
    }

    this.dataChannel = null
    this.peerConnection = null
  }

  public getConnectionState(): PeerConnectionState {
    return this.peerConnection ? (this.peerConnection.connectionState as PeerConnectionState) : "closed"
  }

  public getDataChannelState(): DataChannelState {
    return this.dataChannel ? (this.dataChannel.readyState as DataChannelState) : "closed"
  }
}
