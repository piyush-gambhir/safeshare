import { useState } from "react";
import { Button } from "./ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { useToast } from "../hooks/use-toast";
import { initiateShare, getSessionInfo, updateTorrent } from "../lib/api";
import { FileMetadata } from "../types/fileShare";

export default function FileTransfer() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [shareLink, setShareLink] = useState<string>("");
    const progress = 0;
    const [status, setStatus] = useState<string>("idle");
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [connectionId, setConnectionId] = useState<string>("");
    const { toast } = useToast();

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
            setIsUploading(true);
            setStatus("initiating");

            // Create file metadata
            const fileMetadata: FileMetadata = {
                name: selectedFile.name,
                size: selectedFile.size,
                type: selectedFile.type,
            };

            // Initiate share session
            const shareResponse = await initiateShare(fileMetadata);
            setShareLink(shareResponse.shareableLink);

            // Initialize WebTorrent and seed the file
            const { initializeWebtorrent, seedFile } = window.electron;
            const initialized = await initializeWebtorrent();
            if (!initialized.success) throw new Error(initialized.error);
            const seeded = await seedFile(selectedFile);
            if (!seeded.success) throw new Error(seeded.error);
            const { magnetUri, infoHash } = seeded;

            // Update session with torrent info
            await updateTorrent({
                sessionId: shareResponse.sessionId,
                torrentInfoHash: infoHash,
                magnetUri,
            });

            setStatus("ready");
            toast({
                title: "File Ready",
                description:
                    "Share the connection ID with the recipient to start the transfer.",
            });
        } catch (error) {
            console.error("Host initialization error:", error);
            setStatus("error");
            setIsUploading(false);
            toast({
                title: "Connection Failed",
                description: "There was an error initializing the connection.",
                variant: "destructive",
            });
        }
    };

    // Initialize as guest (receiver)
    const initializeAsGuest = async () => {
        if (!connectionId) return;

        try {
            setIsDownloading(true);
            setStatus("initiating");

            // Get session information
            const sessionInfo = await getSessionInfo(connectionId);

            // Get downloads path
            const destination = await window.electron.getDownloadsPath();
            if (!destination.success) throw new Error(destination.error);
            const downloadPath = destination.path;

            // Start downloading the file
            setStatus("downloading");
            const { downloadFile } = window.electron;
            const result = await downloadFile(
                sessionInfo.magnetUri,
                downloadPath,
            );

            if (!result.success) throw new Error(result.error);
            if (result.success) {
                setStatus("completed");
                setIsDownloading(false);
                toast({
                    title: "Download Complete",
                    description: `File saved to: ${result.path}`,
                });
            }
        } catch (error) {
            console.error("Guest initialization error:", error);
            setStatus("error");
            setIsDownloading(false);
            toast({
                title: "Download Failed",
                description: "There was an error downloading the file.",
                variant: "destructive",
            });
        }
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
                <div className="space-y-2 [&>input]:mt-2">
                    <Label htmlFor="file">Select File</Label>
                    <Input
                        id="file"
                        type="file"
                        onChange={handleFileSelect}
                        disabled={isUploading || isDownloading}
                    />
                </div>

                <div className="space-y-2 [&>input]:mt-2">
                    <Label htmlFor="connectionId">Connection ID</Label>
                    <Input
                        id="connectionId"
                        placeholder="Enter connection ID to join"
                        value={connectionId}
                        onChange={(e) => setConnectionId(e.target.value)}
                        disabled={isUploading || isDownloading}
                    />
                </div>

                {shareLink && (
                    <div className="space-y-2 [&>input]:mt-2">
                        <Label htmlFor="shareLink">Share Link</Label>
                        <Input
                            id="shareLink"
                            value={shareLink}
                            readOnly
                            className="bg-muted"
                        />
                    </div>
                )}

                {(isUploading || isDownloading) && (
                    <div className="space-y-2 [&>input]:mt-2">
                        <div className="flex justify-between text-sm">
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
                    {isUploading ? "Preparing..." : "Share File"}
                </Button>
                <Button
                    onClick={initializeAsGuest}
                    disabled={!connectionId || isUploading || isDownloading}
                >
                    {isDownloading ? "Downloading..." : "Receive File"}
                </Button>
            </CardFooter>
        </Card>
    );
}
