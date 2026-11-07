import { FileCheck, Lock, Server, Share2, Shield, Zap } from 'lucide-react';
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
        <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
            <div className="relative mb-12">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 opacity-30 blur-3xl"></div>
                <h1 className="relative mb-6 text-3xl font-bold">
                    How SafeShare Works
                </h1>
            </div>

            <p className="mb-8 text-muted-foreground">
                SafeShare sends files directly between two browsers and
                encrypts them end to end before they leave the sender&apos;s
                device. Here is what each part does:
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
                            SafeShare uses WebRTC data channels to connect the
                            two browsers directly, so the file never passes
                            through a central server. There is no relay
                            server: if the two devices cannot reach each other
                            directly, the transfer does not start.
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
                                AES-GCM with a 256-bit key
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Your browser generates a new 256-bit AES-GCM key for
                            every transfer and puts it in the part of the share
                            link after the #. Browsers never send that part to
                            a server, so only someone with the full link can
                            decrypt the file. The file name, size and type are
                            encrypted too.
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
                                Every chunk is authenticated
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Files are sent in 64 KB chunks. Each chunk is
                            encrypted with its own nonce and bound to its
                            position in the transfer, so a chunk that is
                            altered, reordered, duplicated or dropped fails to
                            decrypt and the transfer stops.
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
                            A signaling server relays the two browsers&apos;
                            connection offers so they can find each other. It
                            sees a random session ID, connection details such
                            as IP addresses, and timing. It never receives the
                            key, the file or its name, and it is not involved
                            once the transfer starts.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border bg-background/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <FileCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Verified Before Download</CardTitle>
                            <CardDescription>
                                No partial or altered files
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            The last encrypted message carries the number of
                            chunks and bytes sent. The download button appears
                            only after the receiver&apos;s browser has checked
                            them, so an interrupted transfer never produces a
                            partial file. Interrupted transfers start over with
                            a new link.
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
                            The sender selects a file and creates a share link.
                            Their browser generates the encryption key and puts
                            it after the # in the link.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            2
                        </span>
                        <span className="pt-1">
                            The sender passes the link to the recipient over a
                            channel they trust. Anyone with the full link can
                            receive the file.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            3
                        </span>
                        <span className="pt-1">
                            The recipient opens the link. Their browser reads
                            the key, removes it from the address bar, and
                            connects directly to the sender.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            4
                        </span>
                        <span className="pt-1">
                            The file name, size and contents are encrypted
                            chunk by chunk and sent directly between the
                            browsers.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            5
                        </span>
                        <span className="pt-1">
                            The recipient&apos;s browser decrypts and verifies
                            every chunk, then checks the final chunk count.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            6
                        </span>
                        <span className="pt-1">
                            The file is ready for the recipient to save to
                            their device.
                        </span>
                    </li>
                </ol>
            </div>
        </div>
    );
}
