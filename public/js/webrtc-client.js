/**
 * SafeShare WebRTC Client
 * This library handles WebRTC connections for direct peer-to-peer file transfer.
 */
class SafeShareWebRTC {
  constructor(apiBase, authToken) {
    this.apiBase = apiBase;
    this.authToken = authToken;
    this.roomId = null;
    this.peerConnection = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.connected = false;
    this.onConnectedCallback = null;
    this.onDisconnectedCallback = null;
    this.onProgressCallback = null;
    this.onFileReceivedCallback = null;
    this.receivedChunks = [];
    this.fileInfo = null;
    this.chunkSize = 16384; // 16KB chunks
    this.currentChunk = 0;
    this.totalChunks = 0;
    this.iceCandidateQueue = [];
    this.signalPollingInterval = null;
  }

  /**
   * Initialize WebRTC for sending a file
   * @param {string} transferId - The ID of the transfer
   * @returns {Promise<string>} - The room ID
   */
  async initSender(transferId) {
    this.isInitiator = true;

    // Create a room
    const response = await fetch(`${this.apiBase}/api/webrtc/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        transfer_id: transferId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create room: ${response.statusText}`);
    }

    const data = await response.json();
    this.roomId = data.room_id;

    // Setup peer connection
    this.setupPeerConnection();

    // Create data channel
    this.dataChannel = this.peerConnection.createDataChannel("fileTransfer");
    this.setupDataChannel();

    // Create and send offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Send offer to signaling server
    await this.sendSignal("offer", offer.sdp);

    // Start polling for answer and ICE candidates
    this.startSignalPolling();

    return this.roomId;
  }

  /**
   * Initialize WebRTC for receiving a file
   * @param {string} roomId - The room ID to join
   * @returns {Promise<void>}
   */
  async initReceiver(roomId) {
    this.isInitiator = false;
    this.roomId = roomId;

    // Join the room
    const response = await fetch(
      `${this.apiBase}/api/webrtc/rooms/${roomId}/join`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to join room: ${response.statusText}`);
    }

    // Setup peer connection
    this.setupPeerConnection();

    // Handle data channel created by the initiator
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    // Start polling for offer and ICE candidates
    this.startSignalPolling();
  }

  /**
   * Set up the WebRTC peer connection
   */
  setupPeerConnection() {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal("ice-candidate", JSON.stringify(event.candidate));
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection.connectionState === "connected") {
        this.connected = true;
        if (this.onConnectedCallback) {
          this.onConnectedCallback();
        }
      } else if (
        this.peerConnection.connectionState === "disconnected" ||
        this.peerConnection.connectionState === "failed" ||
        this.peerConnection.connectionState === "closed"
      ) {
        this.connected = false;
        if (this.onDisconnectedCallback) {
          this.onDisconnectedCallback();
        }
      }
    };
  }

  /**
   * Set up the WebRTC data channel
   */
  setupDataChannel() {
    this.dataChannel.onopen = () => {
      console.log("Data channel is open");
    };

    this.dataChannel.onclose = () => {
      console.log("Data channel is closed");
    };

    this.dataChannel.onmessage = (event) => {
      if (typeof event.data === "string") {
        // This is file metadata
        const metadata = JSON.parse(event.data);
        this.fileInfo = metadata;
        this.totalChunks = Math.ceil(metadata.size / this.chunkSize);
        this.receivedChunks = [];
        this.currentChunk = 0;
      } else {
        // This is file data
        this.receivedChunks.push(event.data);
        this.currentChunk++;

        if (this.onProgressCallback) {
          const progress = (this.currentChunk / this.totalChunks) * 100;
          this.onProgressCallback(progress);
        }

        if (this.currentChunk === this.totalChunks) {
          // All chunks received, reconstruct the file
          const file = new Blob(this.receivedChunks, {
            type: this.fileInfo.type,
          });

          if (this.onFileReceivedCallback) {
            this.onFileReceivedCallback(file, this.fileInfo.name);
          }
        }
      }
    };
  }

  /**
   * Send a file via WebRTC
   * @param {File} file - The file to send
   * @returns {Promise<void>}
   */
  async sendFile(file) {
    if (
      !this.connected ||
      !this.dataChannel ||
      this.dataChannel.readyState !== "open"
    ) {
      throw new Error("WebRTC not connected");
    }

    // Send file metadata
    const metadata = {
      name: file.name,
      type: file.type,
      size: file.size,
    };
    this.dataChannel.send(JSON.stringify(metadata));

    // Calculate chunks
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
    this.currentChunk = 0;

    // Read and send the file in chunks
    const reader = new FileReader();
    let offset = 0;

    const readSlice = (o) => {
      const slice = file.slice(offset, o + this.chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      this.dataChannel.send(e.target.result);
      this.currentChunk++;

      if (this.onProgressCallback) {
        const progress = (this.currentChunk / this.totalChunks) * 100;
        this.onProgressCallback(progress);
      }

      offset += this.chunkSize;
      if (offset < file.size) {
        readSlice(offset);
      }
    };

    readSlice(0);
  }

  /**
   * Send a WebRTC signal to the server
   * @param {string} type - The type of signal
   * @param {string} data - The signal data
   * @returns {Promise<void>}
   */
  async sendSignal(type, data) {
    const response = await fetch(`${this.apiBase}/api/webrtc/signal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        room_id: this.roomId,
        type: type,
        data: data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send signal: ${response.statusText}`);
    }
  }

  /**
   * Get signals from the server
   * @param {string} type - The type of signal to get
   * @returns {Promise<Array>} - The signals
   */
  async getSignals(type) {
    const response = await fetch(
      `${this.apiBase}/api/webrtc/signal/${this.roomId}/${type}`,
      {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get signals: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Process received offers
   * @returns {Promise<void>}
   */
  async processOffers() {
    if (this.isInitiator) return;

    const offers = await this.getSignals("offer");
    if (offers.length === 0) return;

    // Take the latest offer
    const offerSdp = offers[offers.length - 1];
    const offer = new RTCSessionDescription({
      type: "offer",
      sdp: offerSdp,
    });

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Send answer
    await this.sendSignal("answer", answer.sdp);

    // Process any queued ICE candidates
    for (const candidate of this.iceCandidateQueue) {
      await this.peerConnection.addIceCandidate(candidate);
    }
    this.iceCandidateQueue = [];
  }

  /**
   * Process received answers
   * @returns {Promise<void>}
   */
  async processAnswers() {
    if (!this.isInitiator) return;

    const answers = await this.getSignals("answer");
    if (answers.length === 0) return;

    // Take the latest answer
    const answerSdp = answers[answers.length - 1];
    const answer = new RTCSessionDescription({
      type: "answer",
      sdp: answerSdp,
    });

    await this.peerConnection.setRemoteDescription(answer);

    // Process any queued ICE candidates
    for (const candidate of this.iceCandidateQueue) {
      await this.peerConnection.addIceCandidate(candidate);
    }
    this.iceCandidateQueue = [];
  }

  /**
   * Process received ICE candidates
   * @returns {Promise<void>}
   */
  async processIceCandidates() {
    const candidates = await this.getSignals("ice-candidate");
    if (candidates.length === 0) return;

    for (const candidateStr of candidates) {
      const candidate = JSON.parse(candidateStr);

      if (this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(candidate);
      } else {
        this.iceCandidateQueue.push(candidate);
      }
    }
  }

  /**
   * Start polling for signals
   */
  startSignalPolling() {
    this.signalPollingInterval = setInterval(async () => {
      try {
        if (!this.isInitiator) {
          await this.processOffers();
        } else {
          await this.processAnswers();
        }
        await this.processIceCandidates();

        // Stop polling when connected
        if (this.connected) {
          this.stopSignalPolling();
        }
      } catch (error) {
        console.error("Error polling signals:", error);
      }
    }, 1000);
  }

  /**
   * Stop polling for signals
   */
  stopSignalPolling() {
    if (this.signalPollingInterval) {
      clearInterval(this.signalPollingInterval);
      this.signalPollingInterval = null;
    }
  }

  /**
   * Close the WebRTC connection
   */
  close() {
    this.stopSignalPolling();

    if (this.dataChannel) {
      this.dataChannel.close();
    }

    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.connected = false;
  }

  /**
   * Register callback for when WebRTC is connected
   * @param {Function} callback - The callback function
   */
  onConnected(callback) {
    this.onConnectedCallback = callback;
  }

  /**
   * Register callback for when WebRTC is disconnected
   * @param {Function} callback - The callback function
   */
  onDisconnected(callback) {
    this.onDisconnectedCallback = callback;
  }

  /**
   * Register callback for transfer progress updates
   * @param {Function} callback - The callback function
   */
  onProgress(callback) {
    this.onProgressCallback = callback;
  }

  /**
   * Register callback for when a file is received
   * @param {Function} callback - The callback function
   */
  onFileReceived(callback) {
    this.onFileReceivedCallback = callback;
  }
}
