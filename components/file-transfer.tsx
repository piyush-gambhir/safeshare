'use client';

import { useEffect, useRef, useState } from 'react';

import {
    FileMetadata,
    getSessionInfo,
    initiateShare,
    updateStatus,
    updateTorrent,
} from '@/lib/api';
import {
    addIceCandidate,
    createAnswer,
    createOffer,
    createPeerConnection,
    receiveFile,
    sendFile,
    setRemoteDescription,
} from '@/lib/webrtc';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';

export default function FileTransfer() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [shareLink, setShareLink] = useState<string>('');
    const [sessionId, setSessionId] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [peers, setPeers] = useState<number>(0);
    const [status, setStatus] = useState<string>('idle');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [connectionId, setConnectionId] = useState<string>('');
    const [isHost, setIsHost] = useState<boolean>(false);
    const { toast } = useToast();

    // Refs for WebRTC
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const iceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

    // Handle file selection
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    // Initialize as host (sender)
    const initializeAsHost = async () => {
        if (!selectedFile) return;

        try {
            setIsHost(true);
            setIsUploading(true);
            setStatus('initiating');

            // Create file metadata
            const fileMetadata: FileMetadata = {
                name: selectedFile.name,
                size: selectedFile.size,
                type: selectedFile.type,
            };

            // Initiate share session
            const shareResponse = await initiateShare(fileMetadata);
            setSessionId(shareResponse.sessionId);
            setConnectionId(shareResponse.sessionId);
            setShareLink(shareResponse.shareableLink);

            // Create WebRTC peer connection
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;

            // Set up ICE candidate handling
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    iceCandidatesRef.current.push(event.candidate);
                }
            };

            // Create data channel
            const dataChannel = pc.createDataChannel('fileTransfer', {
                ordered: true,
            });
            dataChannelRef.current = dataChannel;

            // Set up data channel events
            dataChannel.onopen = () => {
                setStatus('connected');
                setPeers(1);
            };

            // Create and set local description (offer)
            const offer = await createOffer(pc);

            // Update session with offer and ICE candidates
            await updateTorrent(
                shareResponse.sessionId,
                shareResponse.torrentInfoHash,
                JSON.stringify({
                    type: 'webrtc',
                    offer,
                    iceCandidates: iceCandidatesRef.current,
                }),
            );

            setStatus('waiting');
        } catch (error) {
            console.error('Host initialization error:', error);
            setStatus('error');
            setIsUploading(false);
            toast({
                title: 'Connection Failed',
                description: 'There was an error initializing the connection.',
                variant: 'destructive',
            });
        }
    };

    // Initialize as guest (receiver)
    const initializeAsGuest = async () => {
        if (!connectionId) return;

        try {
            setIsHost(false);
            setIsDownloading(true);
            setStatus('initiating');

            // Get session information
            const sessionInfo = await getSessionInfo(connectionId);

            // Parse WebRTC data
            const webrtcData = JSON.parse(sessionInfo.magnetUri);

            // Create WebRTC peer connection
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;

            // Set up data channel event
            pc.ondatachannel = (event) => {
                dataChannelRef.current = event.channel;

                // Set up file receiving
                receiveFile(
                    event.channel,
                    (metadata) => {
                        setStatus('receiving');
                        toast({
                            title: 'Receiving File',
                            description: `Receiving ${metadata.name} (${formatFileSize(metadata.size)})`,
                        });
                    },
                    (progress) => {
                        setProgress(progress);
                    },
                    (file) => {
                        // Download the file
                        const url = URL.createObjectURL(file);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = file.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        setStatus('completed');
                        setIsDownloading(false);
                        toast({
                            title: 'Download Complete',
                            description:
                                'File has been successfully downloaded.',
                        });
                    },
                );
            };

            // Set up ICE candidate handling
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    iceCandidatesRef.current.push(event.candidate);
                }
            };

            // Set remote description (offer)
            await pc.setRemoteDescription(
                new RTCSessionDescription(webrtcData.offer),
            );

            // Add ICE candidates
            for (const candidate of webrtcData.iceCandidates) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }

            // Create and set local description (answer)
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Update session with answer and ICE candidates
            await updateTorrent(
                sessionInfo.sessionId,
                sessionInfo.torrentInfoHash,
                JSON.stringify({
                    type: 'webrtc',
                    answer,
                    iceCandidates: iceCandidatesRef.current,
                }),
            );

            setStatus('connecting');
        } catch (error) {
            console.error('Guest initialization error:', error);
            setStatus('error');
            setIsDownloading(false);
            toast({
                title: 'Connection Failed',
                description: 'There was an error connecting to the host.',
                variant: 'destructive',
            });
        }
    };

    // Check for answer from guest
    useEffect(() => {
        if (!isHost || status !== 'waiting') return;

        const checkForAnswer = async () => {
            try {
                const sessionInfo = await getSessionInfo(sessionId);
                const webrtcData = JSON.parse(sessionInfo.magnetUri);

                if (webrtcData.type === 'webrtc' && webrtcData.answer) {
                    // Set remote description (answer)
                    await peerConnectionRef.current?.setRemoteDescription(
                        new RTCSessionDescription(webrtcData.answer),
                    );

                    // Add ICE candidates
                    for (const candidate of webrtcData.iceCandidates) {
                        await peerConnectionRef.current?.addIceCandidate(
                            new RTCIceCandidate(candidate),
                        );
                    }

                    setStatus('connected');
                }
            } catch (error) {
                console.error('Error checking for answer:', error);
            }
        };

        const interval = setInterval(checkForAnswer, 2000);
        return () => clearInterval(interval);
    }, [isHost, status, sessionId]);

    // Send file when connection is established
    useEffect(() => {
        if (
            !isHost ||
            status !== 'connected' ||
            !dataChannelRef.current ||
            !selectedFile
        )
            return;

        const sendFileData = async () => {
            try {
                setStatus('sending');
                await sendFile(
                    dataChannelRef.current!,
                    selectedFile,
                    (progress) => {
                        setProgress(progress);
                    },
                );

                setStatus('completed');
                setIsUploading(false);
                toast({
                    title: 'Upload Complete',
                    description: 'File has been successfully shared.',
                });
            } catch (error) {
                console.error('Error sending file:', error);
                setStatus('error');
                setIsUploading(false);
                toast({
                    title: 'Upload Failed',
                    description: 'There was an error sending the file.',
                    variant: 'destructive',
                });
            }
        };

        sendFileData();
    }, [isHost, status, selectedFile]);

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Card className="mx-auto w-full max-w-md">
            <CardHeader>
                <CardTitle>File Transfer</CardTitle>
                <CardDescription>
                    Share files securely using P2P technology
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="file">Select File</Label>
                    <Input
                        id="file"
                        type="file"
                        onChange={handleFileSelect}
                        disabled={isUploading || isDownloading}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="connectionId">Connection ID</Label>
                    <Input
                        id="connectionId"
                        placeholder="Enter connection ID to join"
                        value={connectionId}
                        onChange={(e) => setConnectionId(e.target.value)}
                        disabled={isUploading || isDownloading}
                    />
                </div>

                {(isUploading || isDownloading) && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Progress: {Math.round(progress)}%</span>
                            <span>Status: {status}</span>
                        </div>
                        <Progress value={progress} />
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button
                    onClick={initializeAsHost}
                    disabled={!selectedFile || isUploading || isDownloading}
                >
                    {isUploading ? 'Uploading...' : 'Share File'}
                </Button>
                <Button
                    onClick={initializeAsGuest}
                    disabled={!connectionId || isUploading || isDownloading}
                >
                    {isDownloading ? 'Downloading...' : 'Join Session'}
                </Button>
            </CardFooter>
        </Card>
    );
}
