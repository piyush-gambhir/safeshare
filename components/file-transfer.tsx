'use client';

// Import Next.js Image component
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    Archive,
    CheckCircle2,
    Clock,
    Code,
    Copy,
    Download,
    ExternalLink,
    File,
    FileIcon,
    FileText,
    Film,
    ImageIcon,
    Info,
    Link,
    Music,
    Pause,
    Play,
    QrCode,
    RefreshCw,
    Server,
    Share2,
    Shield,
    Upload,
    X,
} from 'lucide-react';
// Import useCallback
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QRCode } from 'react-qrcode-logo';

import {
    FileTransferManager,
    TransferError,
    TransferProgress,
    TransferState,
} from '@/lib/file-transfer-manager';
// Corrected import
import { type SignalData, SignalingService } from '@/lib/signaling-service';
import { cn } from '@/lib/utils';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

// Corrected import

export default function FileTransfer() {
    const [activeTab, setActiveTab] = useState<string>('send');
    const [file, setFile] = useState<File | null>(null);
    const [receivedFile, setReceivedFile] = useState<File | null>(null);
    const [channelId, setChannelId] = useState<string>('');
    const [joinChannelId, setJoinChannelId] = useState<string>('');
    const [transferState, setTransferState] = useState<TransferState>('idle');
    const [progress, setProgress] = useState<TransferProgress | null>(null);
    const [error, setError] = useState<TransferError | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isGeneratingLink, setIsGeneratingLink] = useState<boolean>(false);
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<
        number | null
    >(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const transferManagerRef = useRef<FileTransferManager | null>(null);
    const signalingServiceRef = useRef<SignalingService | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const transferStartTimeRef = useRef<number>(0);

    const { toast } = useToast();

    // Wrap handlers used in useEffect dependencies with useCallback
    const handleStateChange = useCallback(
        (state: TransferState) => {
            setTransferState(state);

            if (state === 'transferring') {
                // Start timer for elapsed time
                transferStartTimeRef.current = Date.now();
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }

                timerRef.current = setInterval(() => {
                    const elapsed = Math.floor(
                        (Date.now() - transferStartTimeRef.current) / 1000,
                    );
                    setElapsedTime(elapsed);
                }, 1000);
            } else if (state === 'completed') {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }

                toast({
                    // toast is now stable due to useToast hook
                    title: 'Transfer Complete',
                    description: receivedFile
                        ? `Successfully received ${receivedFile.name}`
                        : 'File transfer completed successfully',
                    variant: 'success',
                });
            } else if (state === 'error') {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            } else if (state === 'idle') {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
                setElapsedTime(0);
                setEstimatedTimeRemaining(null);
            }
        },
        [receivedFile, toast],
    ); // Add dependencies used inside

    const handleError = useCallback(
        (error: TransferError) => {
            setError(error);
            toast({
                // toast is now stable
                title: 'Transfer Error',
                description: error.message,
                variant: 'destructive',
            });
        },
        [toast],
    ); // Add dependencies used inside

    const handleFileReceived = useCallback((file: File) => {
        setReceivedFile(file);

        // Create preview URL for image files
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setFilePreviewUrl(url);
        }
    }, []); // No external dependencies

    const handlePeerConnected = useCallback(
        (peerId: string) => {
            // Keep peerId parameter even if unused for now
            toast({
                // toast is now stable
                title: 'Peer Connected',
                description: 'Connection established with peer', // Use peerId here if needed in the future
                variant: 'success',
            });
        },
        [toast],
    ); // Add dependencies used inside

    // Initialize services
    useEffect(() => {
        transferManagerRef.current = new FileTransferManager();
        signalingServiceRef.current = new SignalingService();

        const transferManager = transferManagerRef.current;
        const signalingService = signalingServiceRef.current;

        // Set up event listeners using the memoized handlers
        transferManager.onStateChange(handleStateChange);
        transferManager.onProgress(handleProgress); // Assuming handleProgress doesn't need useCallback yet
        transferManager.onError(handleError);
        transferManager.onFileReceived(handleFileReceived);
        transferManager.onSignal(handleOutgoingSignal); // Assuming handleOutgoingSignal doesn't need useCallback yet

        signalingService.onSignal(handleIncomingSignal); // Assuming handleIncomingSignal doesn't need useCallback yet
        signalingService.onChannelCreated(handleChannelCreated); // Assuming handleChannelCreated doesn't need useCallback yet
        signalingService.onPeerConnected(handlePeerConnected);

        // Cleanup function
        return () => {
            if (transferManager) {
                transferManager.cancel();
            }
            if (signalingService) {
                signalingService.closeChannel();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (filePreviewUrl) {
                // Access filePreviewUrl directly
                URL.revokeObjectURL(filePreviewUrl);
            }
        };
        // Add all stable dependencies (useCallback refs, state setters are stable)
    }, [
        handleStateChange,
        handleError,
        handleFileReceived,
        handlePeerConnected,
        filePreviewUrl,
    ]); // Add filePreviewUrl

    // Event handlers
    const handleProgress = (progress: TransferProgress) => {
        setProgress(progress);

        // Calculate estimated time remaining
        if (progress.speed > 0) {
            const bytesRemaining =
                progress.totalBytes - progress.bytesTransferred;
            const secondsRemaining = Math.ceil(bytesRemaining / progress.speed);
            setEstimatedTimeRemaining(secondsRemaining);
        }
    };

    const handleOutgoingSignal = (signal: SignalData) => {
        if (signalingServiceRef.current) {
            signalingServiceRef.current.sendSignal(signal).catch((error) => {
                console.error('Error sending signal:', error);
            });
        }
    };

    const handleIncomingSignal = (signal: SignalData) => {
        if (transferManagerRef.current) {
            transferManagerRef.current.handleSignal(signal).catch((error) => {
                console.error('Error handling signal:', error);
            });
        }
    };

    const handleChannelCreated = (channelId: string) => {
        setChannelId(channelId);
        setIsGeneratingLink(false);
    };

    // UI event handlers
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setFile(files[0]);

            // Create preview URL for image files
            if (files[0].type.startsWith('image/')) {
                const url = URL.createObjectURL(files[0]);
                setFilePreviewUrl(url);
            } else {
                setFilePreviewUrl(null);
            }

            toast({
                title: 'File Selected',
                description: `${files[0].name} (${formatFileSize(
                    files[0].size,
                )})`,
            });
        }
    };

    const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);

        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            setFile(files[0]);

            // Create preview URL for image files
            if (files[0].type.startsWith('image/')) {
                const url = URL.createObjectURL(files[0]);
                setFilePreviewUrl(url);
            } else {
                setFilePreviewUrl(null);
            }

            toast({
                title: 'File Selected',
                description: `${files[0].name} (${formatFileSize(
                    files[0].size,
                )})`,
            });
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleSendFile = async () => {
        if (
            !file ||
            !transferManagerRef.current ||
            !signalingServiceRef.current
        ) {
            return;
        }

        try {
            setIsGeneratingLink(true);
            // Create a signaling channel
            await signalingServiceRef.current.createChannel();

            // Initiate file transfer
            await transferManagerRef.current.initiateSend(file);
        } catch (error) {
            setIsGeneratingLink(false);
            console.error('Error initiating send:', error);
            toast({
                title: 'Connection Error',
                description: 'Failed to create sharing link. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleJoinChannel = async () => {
        if (
            !joinChannelId ||
            !transferManagerRef.current ||
            !signalingServiceRef.current
        ) {
            return;
        }

        try {
            setIsJoining(true);
            // Join the signaling channel
            await signalingServiceRef.current.joinChannel(joinChannelId);

            // Initiate file receive
            await transferManagerRef.current.initiateReceive();
        } catch (error) {
            setIsJoining(false);
            console.error('Error joining channel:', error);
            toast({
                title: 'Connection Error',
                description:
                    'Failed to join channel. Please check the ID and try again.',
                variant: 'destructive',
            });
        }
    };

    const handlePauseResume = () => {
        if (!transferManagerRef.current) {
            return;
        }

        if (transferState === 'transferring') {
            transferManagerRef.current.pause();
            toast({
                title: 'Transfer Paused',
                description: 'You can resume the transfer at any time.',
            });
        } else if (transferState === 'paused') {
            transferManagerRef.current.resume();
            toast({
                title: 'Transfer Resumed',
                description: 'Continuing from where we left off.',
            });
        }
    };

    const handleCancel = () => {
        if (!transferManagerRef.current) {
            return;
        }

        transferManagerRef.current.cancel();
        setFile(null);
        setReceivedFile(null);
        setChannelId('');
        setJoinChannelId('');
        setProgress(null);
        setError(null);
        setIsGeneratingLink(false);
        setIsJoining(false);

        // Clean up file preview URL
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl);
            setFilePreviewUrl(null);
        }

        toast({
            title: 'Transfer Cancelled',
            description: 'The file transfer has been cancelled.',
        });
    };

    const handleCopyLink = () => {
        if (!channelId) {
            return;
        }

        const url = `${window.location.origin}?channel=${channelId}`;
        navigator.clipboard.writeText(url).then(() => {
            toast({
                title: 'Link Copied',
                description: 'Sharing link copied to clipboard.',
                variant: 'success',
            });
        });
    };

    const handleDownloadFile = () => {
        if (!receivedFile) {
            return;
        }

        const url = URL.createObjectURL(receivedFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = receivedFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: 'Download Started',
            description: `Downloading ${receivedFile.name}`,
            variant: 'success',
        });
    };

    // Check for channel ID in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const channelIdFromUrl = params.get('channel'); // Rename to avoid conflict

        if (channelIdFromUrl) {
            setJoinChannelId(channelIdFromUrl);
            setActiveTab('receive');

            toast({
                // Add toast dependency
                title: 'Sharing Link Detected',
                description: 'Ready to receive a file from this link.',
            });
        }
    }, [toast]); // Add toast dependency

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return (
            Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
            ' ' +
            sizes[i]
        );
    };

    // Format transfer speed
    const formatSpeed = (bytesPerSecond: number): string => {
        if (bytesPerSecond === 0) return '0 B/s';

        const k = 1024;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

        return (
            Number.parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) +
            ' ' +
            sizes[i]
        );
    };

    // Format time (seconds to MM:SS)
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
            .toString()
            .padStart(2, '0')}`;
    };

    // Get file type icon
    const getFileTypeIcon = (file: File | null) => {
        if (!file) return <FileIcon className="h-12 w-12" />;

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (file.type.startsWith('image/')) {
            return <ImageIcon className="h-12 w-12 text-blue-500" />;
        } else if (file.type.startsWith('video/')) {
            return <Film className="h-12 w-12 text-red-500" />;
        } else if (file.type.startsWith('audio/')) {
            return <Music className="h-12 w-12 text-purple-500" />;
        } else if (file.type.startsWith('text/')) {
            return <FileText className="h-12 w-12 text-yellow-500" />;
        } else if (
            extension === 'zip' ||
            extension === 'rar' ||
            extension === '7z' ||
            extension === 'tar' ||
            extension === 'gz'
        ) {
            return <Archive className="h-12 w-12 text-orange-500" />;
        } else if (
            extension === 'js' ||
            extension === 'ts' ||
            extension === 'html' ||
            extension === 'css' ||
            extension === 'json' ||
            extension === 'py' ||
            extension === 'java' ||
            extension === 'php'
        ) {
            return <Code className="h-12 w-12 text-green-500" />;
        }

        return <File className="h-12 w-12 text-gray-500" />;
    };

    // Render transfer status
    const renderTransferStatus = () => {
        if (error) {
            return (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error.message}</AlertDescription>
                    </Alert>
                </motion.div>
            );
        }

        if (transferState === 'idle') {
            return null;
        }

        if (transferState === 'completed' && receivedFile) {
            return (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    <Alert className="mt-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle>Transfer Complete</AlertTitle>
                        <AlertDescription>
                            <div className="mt-2 space-y-4">
                                <div className="flex items-center gap-3">
                                    {filePreviewUrl ? (
                                        <Image
                                            src={filePreviewUrl}
                                            alt={receivedFile.name}
                                            width={48}
                                            height={48}
                                            className="h-16 w-16 rounded-md border object-cover"
                                        />
                                    ) : (
                                        getFileTypeIcon(receivedFile)
                                    )}
                                    <div>
                                        <p className="font-medium">
                                            {receivedFile.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatFileSize(receivedFile.size)}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleDownloadFile}
                                    className="mt-2 w-full"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download File
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </motion.div>
            );
        }

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-4 space-y-4"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                                {transferState === 'connecting'
                                    ? 'Establishing Connection...'
                                    : transferState === 'preparing'
                                      ? 'Preparing Transfer...'
                                      : transferState === 'transferring'
                                        ? 'Transferring...'
                                        : transferState === 'paused'
                                          ? 'Transfer Paused'
                                          : 'Processing...'}
                            </p>
                            {transferState === 'transferring' && (
                                <Badge
                                    variant="outline"
                                    className="animate-pulse bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                                >
                                    Live
                                </Badge>
                            )}
                            {transferState === 'paused' && (
                                <Badge variant="outline">Paused</Badge>
                            )}
                        </div>
                        {progress && (
                            <div className="mt-1 flex flex-col text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <span>
                                        {formatFileSize(
                                            progress.bytesTransferred,
                                        )}{' '}
                                        of {formatFileSize(progress.totalBytes)}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium">
                                        {formatSpeed(progress.speed)}
                                    </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                        Elapsed: {formatTime(elapsedTime)}
                                    </span>
                                    {estimatedTimeRemaining !== null && (
                                        <>
                                            <span>•</span>
                                            <span>
                                                ETA:{' '}
                                                {formatTime(
                                                    estimatedTimeRemaining,
                                                )}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        {(transferState === 'transferring' ||
                            transferState === 'paused') && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={handlePauseResume}
                                        >
                                            {transferState ===
                                            'transferring' ? (
                                                <Pause className="h-4 w-4" />
                                            ) : (
                                                <Play className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {transferState === 'transferring'
                                            ? 'Pause Transfer'
                                            : 'Resume Transfer'}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleCancel}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancel Transfer</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {progress && (
                    <div className="space-y-1">
                        <Progress value={progress.percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{Math.round(progress.percentage)}%</span>
                            <span>
                                {progress.chunksTransferred} of{' '}
                                {progress.totalChunks} chunks
                            </span>
                        </div>
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <Card className="border-opacity-50 mx-auto mt-8 w-full max-w-md bg-background/80 bg-white shadow-lg backdrop-blur-sm">
            <CardHeader className="pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-xl">
                            Transfer Files
                        </CardTitle>
                        <CardDescription>
                            Secure, encrypted peer-to-peer transfers
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="outline"
                                        className="gap-1 py-1"
                                    >
                                        <Shield className="h-3 w-3" />
                                        <span className="hidden sm:inline">
                                            End-to-End Encrypted
                                        </span>
                                        <span className="sm:hidden">
                                            Encrypted
                                        </span>
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        All transfers are secured with AES-256
                                        encryption
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pb-6">
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                >
                    <TabsList className="mb-6 grid w-full grid-cols-2">
                        <TabsTrigger
                            value="send"
                            className="flex items-center gap-1.5"
                        >
                            <Upload className="h-4 w-4" />
                            <span>Send</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="receive"
                            className="flex items-center gap-1.5"
                        >
                            <Download className="h-4 w-4" />
                            <span>Receive</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="send" className="mt-0 space-y-4">
                        <AnimatePresence mode="wait">
                            {!file ? (
                                <motion.div
                                    key="dropzone"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className={cn(
                                        'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all sm:p-12',
                                        isDragging
                                            ? 'border-primary/70 bg-primary/5'
                                            : 'hover:border-muted-foreground/30 hover:bg-muted/50 hover:shadow-md',
                                    )}
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    onDrop={handleFileDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 opacity-70 blur-xl"></div>
                                        <Upload className="relative mx-auto mb-4 h-12 w-12 text-primary" />
                                    </div>
                                    <p className="mb-2 text-base font-medium">
                                        Drag and drop a file here, or click to
                                        select
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Files are transferred directly to the
                                        recipient
                                    </p>
                                    <div className="mt-6 flex items-center justify-center gap-2">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">
                                            End-to-end encrypted
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="fileSelected"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    <div className="rounded-lg border bg-muted/10 p-4 backdrop-blur-sm transition-all hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0">
                                                {filePreviewUrl ? (
                                                    <Image
                                                        src={filePreviewUrl}
                                                        alt={file.name}
                                                        width={48} // Provide width
                                                        height={48} // Provide height
                                                        className="h-12 w-12 rounded-md border object-cover"
                                                    />
                                                ) : (
                                                    getFileTypeIcon(file)
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">
                                                    {file.name}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span>
                                                        {formatFileSize(
                                                            file.size,
                                                        )}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {file.type ||
                                                            'Unknown type'}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setFile(null);
                                                    if (filePreviewUrl) {
                                                        URL.revokeObjectURL(
                                                            filePreviewUrl,
                                                        );
                                                        setFilePreviewUrl(null);
                                                    }
                                                }}
                                                className="flex-shrink-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {transferState === 'idle' ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <Button
                                                className="group relative w-full overflow-hidden"
                                                onClick={handleSendFile}
                                                disabled={isGeneratingLink}
                                            >
                                                <span className="group-hover:animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0"></span>
                                                {isGeneratingLink ? (
                                                    <>
                                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                        Creating Sharing Link...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Share2 className="mr-2 h-4 w-4" />
                                                        Create Sharing Link
                                                    </>
                                                )}
                                            </Button>
                                        </motion.div>
                                    ) : channelId ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="space-y-4"
                                        >
                                            <div className="flex flex-col space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label
                                                        htmlFor="link"
                                                        className="text-sm font-medium"
                                                    >
                                                        Sharing Link
                                                    </Label>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2"
                                                                >
                                                                    <Info className="mr-1 h-3 w-3" />
                                                                    <span className="text-xs">
                                                                        How to
                                                                        share
                                                                    </span>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-xs">
                                                                <p>
                                                                    Share this
                                                                    link with
                                                                    the
                                                                    recipient.
                                                                    When they
                                                                    open it, a
                                                                    secure
                                                                    connection
                                                                    will be
                                                                    established.
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <div className="relative flex-1">
                                                        <Input
                                                            id="link"
                                                            value={`${window.location.origin}?channel=${channelId}`}
                                                            readOnly
                                                            className="pr-10"
                                                        />
                                                        <Link className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                                                    </div>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={
                                                                        handleCopyLink
                                                                    }
                                                                    className="transition-colors hover:bg-primary/10"
                                                                >
                                                                    <Copy className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Copy to
                                                                clipboard
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center pt-2 pb-4">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <QrCode className="h-4 w-4" />
                                                    <span className="text-sm font-medium">
                                                        QR Code
                                                    </span>
                                                </div>
                                                <div className="rounded-xl bg-white p-3 shadow-sm">
                                                    <QRCode
                                                        value={`${window.location.origin}?channel=${channelId}`}
                                                        size={180}
                                                        // Use Next.js Image for logo if possible, or ensure placeholder is in public dir
                                                        logoImage="/favicon.ico" // Example: using favicon
                                                        logoWidth={40}
                                                        logoHeight={40}
                                                        logoPadding={5}
                                                        removeQrCodeBehindLogo={
                                                            true
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                                <Shield className="h-3 w-3" />
                                                <span>
                                                    Secure, end-to-end encrypted
                                                    connection
                                                </span>
                                            </div>
                                        </motion.div>
                                    ) : null}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {renderTransferStatus()}
                    </TabsContent>

                    <TabsContent value="receive" className="mt-0 space-y-4">
                        <AnimatePresence mode="wait">
                            {transferState === 'idle' && !receivedFile ? ( // Added !receivedFile condition
                                <motion.div
                                    key="receiveIdle"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col space-y-2">
                                        <Label
                                            htmlFor="channel-id"
                                            className="text-sm font-medium"
                                        >
                                            Enter Sharing Link or Channel ID
                                        </Label>
                                        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    id="channel-id"
                                                    value={joinChannelId}
                                                    onChange={(e) =>
                                                        setJoinChannelId(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="https://safeshare.com?channel=abc123 or abc123"
                                                    className="pr-10"
                                                />
                                                <Link className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                                            </div>
                                            <Button
                                                onClick={handleJoinChannel}
                                                disabled={
                                                    !joinChannelId || isJoining
                                                }
                                                className="group relative overflow-hidden"
                                            >
                                                <span className="group-hover:animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0"></span>
                                                {isJoining ? (
                                                    <>
                                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                        Joining...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Connect
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Paste the sharing link or channel ID
                                            provided by the sender
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/5 p-6 transition-colors hover:bg-muted/10">
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 opacity-70 blur-xl"></div>
                                            <QrCode className="relative h-12 w-12 text-primary" />
                                        </div>
                                        <p className="mb-1 text-sm font-medium">
                                            Scan QR Code
                                        </p>
                                        <p className="text-center text-xs text-muted-foreground">
                                            If the sender has generated a QR
                                            code, you can scan it with your
                                            device&apos;s camera
                                        </p>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="mt-2"
                                        >
                                            <ExternalLink className="mr-1 h-3 w-3" />
                                            <span className="text-xs">
                                                Open Camera
                                            </span>
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                        <Shield className="h-3 w-3" />
                                        <span>
                                            Files are transferred directly from
                                            the sender to your browser
                                        </span>
                                    </div>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        {/* Render status OR received file info */}
                        {transferState !== 'idle' || receivedFile
                            ? renderTransferStatus()
                            : null}

                        {/* Display received file info if completed and file exists */}
                        {transferState === 'completed' && receivedFile && (
                            <motion.div
                                key="fileReceived"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="mt-4 space-y-4"
                            >
                                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <AlertTitle>
                                        File Received Successfully!
                                    </AlertTitle>
                                    <AlertDescription>
                                        <div className="mt-4 space-y-4">
                                            <div className="flex items-center gap-4 rounded-lg border bg-muted/10 p-4">
                                                <div className="flex-shrink-0">
                                                    {filePreviewUrl ? (
                                                        <Image
                                                            src={filePreviewUrl}
                                                            alt={
                                                                receivedFile.name
                                                            }
                                                            width={48}
                                                            height={48}
                                                            className="h-12 w-12 rounded-md border object-cover"
                                                        />
                                                    ) : (
                                                        getFileTypeIcon(
                                                            receivedFile,
                                                        )
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">
                                                        {receivedFile.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>
                                                            {formatFileSize(
                                                                receivedFile.size,
                                                            )}
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            {receivedFile.type ||
                                                                'Unknown type'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleDownloadFile}
                                                className="w-full"
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Download File
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleCancel} // Reuse cancel to reset state
                                                className="w-full"
                                            >
                                                Receive Another File
                                            </Button>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            </motion.div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col justify-between gap-2 border-t px-6 py-4 text-xs text-muted-foreground sm:flex-row">
                <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    <span>No server storage</span>
                </div>
            </CardFooter>
        </Card>
    );
}
