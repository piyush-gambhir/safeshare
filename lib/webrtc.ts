// WebRTC utility functions for P2P file sharing

// Create a new RTCPeerConnection
export const createPeerConnection = (): RTCPeerConnection => {
    const configuration: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
        ],
    };

    return new RTCPeerConnection(configuration);
};

// Create an offer for a peer connection
export const createOffer = async (
    pc: RTCPeerConnection,
): Promise<RTCSessionDescriptionInit> => {
    const dataChannel = pc.createDataChannel('fileTransfer', { ordered: true });
    setupDataChannel(dataChannel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return offer;
};

// Create an answer for a peer connection
export const createAnswer = async (
    pc: RTCPeerConnection,
    offer: RTCSessionDescriptionInit,
): Promise<RTCSessionDescriptionInit> => {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
    };

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return answer;
};

// Set remote description (for the offerer)
export const setRemoteDescription = async (
    pc: RTCPeerConnection,
    answer: RTCSessionDescriptionInit,
): Promise<void> => {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
};

// Add ICE candidate
export const addIceCandidate = async (
    pc: RTCPeerConnection,
    candidate: RTCIceCandidateInit,
): Promise<void> => {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
};

// Setup data channel for file transfer
const setupDataChannel = (dataChannel: RTCDataChannel): void => {
    // This is a placeholder - the actual implementation will be in the component
    // that uses this utility
};

// Send a file through a data channel
export const sendFile = async (
    dataChannel: RTCDataChannel,
    file: File,
    onProgress?: (progress: number) => void,
): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (dataChannel.readyState !== 'open') {
            reject(new Error('Data channel is not open'));
            return;
        }

        // Send file metadata first
        const metadata = {
            name: file.name,
            size: file.size,
            type: file.type,
        };

        dataChannel.send(JSON.stringify({ type: 'metadata', data: metadata }));

        // Read the file in chunks
        const chunkSize = 16384; // 16KB chunks
        const reader = new FileReader();
        let offset = 0;

        reader.onload = (e) => {
            if (e.target?.result) {
                dataChannel.send(e.target.result as ArrayBuffer);
                offset += (e.target.result as ArrayBuffer).byteLength;

                if (onProgress) {
                    onProgress((offset / file.size) * 100);
                }

                if (offset < file.size) {
                    readNextChunk();
                } else {
                    dataChannel.send(JSON.stringify({ type: 'complete' }));
                    resolve();
                }
            }
        };

        reader.onerror = () => {
            reject(new Error('Error reading file'));
        };

        const readNextChunk = () => {
            const slice = file.slice(offset, offset + chunkSize);
            reader.readAsArrayBuffer(slice);
        };

        readNextChunk();
    });
};

// Receive a file through a data channel
export const receiveFile = (
    dataChannel: RTCDataChannel,
    onMetadata?: (metadata: {
        name: string;
        size: number;
        type: string;
    }) => void,
    onProgress?: (progress: number) => void,
    onComplete?: (file: File) => void,
): void => {
    let metadata: { name: string; size: number; type: string } | null = null;
    const chunks: ArrayBuffer[] = [];
    let receivedSize = 0;

    dataChannel.onmessage = (event) => {
        // Check if the message is metadata
        if (typeof event.data === 'string') {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'metadata') {
                    metadata = message.data;
                    if (onMetadata) {
                        onMetadata(metadata);
                    }
                } else if (message.type === 'complete' && metadata) {
                    // Combine all chunks into a single Blob
                    const blob = new Blob(chunks, { type: metadata.type });
                    const file = new File([blob], metadata.name, {
                        type: metadata.type,
                    });

                    if (onComplete) {
                        onComplete(file);
                    }
                }
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        } else {
            // Binary data (file chunk)
            chunks.push(event.data);
            receivedSize += event.data.byteLength;

            if (onProgress && metadata) {
                onProgress((receivedSize / metadata.size) * 100);
            }
        }
    };
};
