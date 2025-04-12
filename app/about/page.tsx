import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About SafeShare',
    description:
        "Learn about SafeShare's secure peer-to-peer file transfer technology",
};

export default function AboutPage() {
    return (
        <div className="container max-w-3xl px-4 py-12 sm:px-6">
            <div className="relative mb-12">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 opacity-30 blur-3xl"></div>
                <h1 className="relative mb-6 text-3xl font-bold">
                    About SafeShare
                </h1>
            </div>

            <div className="space-y-8">
                <section className="rounded-lg border bg-background/50 p-6 shadow-sm backdrop-blur-sm">
                    <h2 className="mb-3 text-2xl font-semibold">Our Mission</h2>
                    <p className="text-muted-foreground">
                        SafeShare was created with a simple mission: to enable
                        secure, private file transfers without relying on
                        centralized servers or cloud storage. We believe your
                        data should remain yours, and sharing files
                        shouldn&apos;t mean surrendering your privacy.
                    </p>
                </section>

                <section className="rounded-lg border bg-background/50 p-6 shadow-sm backdrop-blur-sm">
                    <h2 className="mb-3 text-2xl font-semibold">
                        How It Works
                    </h2>
                    <p className="mb-3 text-muted-foreground">
                        SafeShare uses WebRTC technology to establish direct
                        peer-to-peer connections between browsers. This means
                        your files travel directly from your device to the
                        recipient&apos;s device, without being stored on any
                        intermediate servers.
                    </p>
                    <p className="text-muted-foreground">
                        All transfers are secured with end-to-end encryption,
                        ensuring that only the intended recipient can access
                        your files. Our lightweight signaling server only helps
                        establish the initial connection, but never sees or
                        stores your files.
                    </p>
                </section>

                <section className="rounded-lg border bg-background/50 p-6 shadow-sm backdrop-blur-sm">
                    <h2 className="mb-3 text-2xl font-semibold">
                        Key Features
                    </h2>
                    <ul className="list-inside list-disc space-y-2 text-muted-foreground">
                        <li>Direct peer-to-peer file transfers</li>
                        <li>End-to-end encryption</li>
                        <li>
                            No file size limits (beyond browser constraints)
                        </li>
                        <li>No account required</li>
                        <li>Works across different browsers and devices</li>
                        <li>Resumable transfers for large files</li>
                        <li>Simple, intuitive interface</li>
                    </ul>
                </section>

                <section className="rounded-lg border bg-background/50 p-6 shadow-sm backdrop-blur-sm">
                    <h2 className="mb-3 text-2xl font-semibold">
                        Privacy Commitment
                    </h2>
                    <p className="text-muted-foreground">
                        We&apos;re committed to privacy by design. SafeShare
                        doesn&apos;t track your transfers, doesn&apos;t store
                        your files, and doesn&apos;t require any personal
                        information. Your data remains completely under your
                        control at all times.
                    </p>
                </section>
            </div>
        </div>
    );
}
