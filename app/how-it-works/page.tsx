import { Lock, RefreshCw, Server, Share2, Shield, Zap } from 'lucide-react';
import type { Metadata } from 'next';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
    title: 'How SafeShare Works',
    description:
        "Learn about the technology behind SafeShare's secure peer-to-peer file transfers",
};

export default function HowItWorksPage() {
    return (
        <div className="container max-w-4xl px-4 py-12 sm:px-6">
            <div className="relative mb-12">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 opacity-30 blur-3xl"></div>
                <h1 className="relative mb-6 text-3xl font-bold">
                    How SafeShare Works
                </h1>
            </div>

            <p className="mb-8 text-muted-foreground">
                SafeShare uses cutting-edge web technologies to enable secure,
                direct file transfers between browsers. Here&apos;s a breakdown
                of the key components and processes that make it work:
            </p>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border bg-background/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Share2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>WebRTC Technology</CardTitle>
                            <CardDescription>
                                Direct peer-to-peer connections
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            SafeShare uses WebRTC (Web Real-Time Communication)
                            to establish direct connections between browsers.
                            This allows files to be transferred directly from
                            one device to another without passing through a
                            central server.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border bg-background/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>End-to-End Encryption</CardTitle>
                            <CardDescription>
                                AES-GCM 256-bit encryption
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            All file transfers are secured with AES-GCM 256-bit
                            encryption. The encryption keys are generated in
                            your browser and shared securely with the recipient,
                            ensuring that only they can decrypt and access your
                            files.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border bg-background/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Chunked File Transfer</CardTitle>
                            <CardDescription>
                                Efficient handling of large files
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Files are split into small chunks before transfer,
                            allowing for efficient handling of large files and
                            enabling features like pause, resume, and recovery
                            from connection issues. Each chunk is encrypted
                            individually for maximum security.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border bg-background/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Server className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Lightweight Signaling</CardTitle>
                            <CardDescription>
                                Minimal server involvement
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            A lightweight signaling server is used only to help
                            establish the initial connection between peers. Once
                            the connection is established, the server is no
                            longer involved in the file transfer process.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border bg-background/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <RefreshCw className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Resumable Transfers</CardTitle>
                            <CardDescription>
                                Recovery from interruptions
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            If a transfer is interrupted due to network issues
                            or browser crashes, SafeShare can resume the
                            transfer from where it left off, without having to
                            start over. This is especially useful for large
                            files.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border bg-background/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Lock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>No Storage</CardTitle>
                            <CardDescription>
                                Your files remain private
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            SafeShare never stores your files on any server.
                            Files exist only on the sender&apos;s and
                            receiver&apos;s devices, ensuring maximum privacy
                            and security. No accounts or logins are required.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-12 rounded-lg border bg-background/50 p-6 shadow-sm backdrop-blur-sm">
                <h2 className="mb-4 text-2xl font-semibold">
                    The Transfer Process
                </h2>

                <ol className="space-y-4 text-muted-foreground">
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            1
                        </span>
                        <span className="pt-1">
                            The sender selects a file and creates a sharing
                            link.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            2
                        </span>
                        <span className="pt-1">
                            The sender shares the link or QR code with the
                            recipient.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            3
                        </span>
                        <span className="pt-1">
                            When the recipient opens the link, a direct
                            peer-to-peer connection is established.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            4
                        </span>
                        <span className="pt-1">
                            The file is encrypted, chunked, and transferred
                            directly between browsers.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            5
                        </span>
                        <span className="pt-1">
                            The recipient&apos;s browser reassembles and
                            decrypts the file.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            6
                        </span>
                        <span className="pt-1">
                            The file is ready for the recipient to download to
                            their device.
                        </span>
                    </li>
                </ol>
            </div>
        </div>
    );
}
