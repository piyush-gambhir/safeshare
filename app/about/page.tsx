import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About SafeShare",
  description: "Learn about SafeShare's secure peer-to-peer file transfer technology",
}

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-12 px-4 sm:px-6">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-3xl opacity-30"></div>
        <h1 className="text-3xl font-bold mb-6 relative">About SafeShare</h1>
      </div>

      <div className="space-y-8">
        <section className="bg-background/50 backdrop-blur-sm p-6 rounded-lg border shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">Our Mission</h2>
          <p className="text-muted-foreground">
            SafeShare was created with a simple mission: to enable secure, private file transfers without relying on
            centralized servers or cloud storage. We believe your data should remain yours, and sharing files shouldn't
            mean surrendering your privacy.
          </p>
        </section>

        <section className="bg-background/50 backdrop-blur-sm p-6 rounded-lg border shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">How It Works</h2>
          <p className="text-muted-foreground mb-3">
            SafeShare uses WebRTC technology to establish direct peer-to-peer connections between browsers. This means
            your files travel directly from your device to the recipient's device, without being stored on any
            intermediate servers.
          </p>
          <p className="text-muted-foreground">
            All transfers are secured with end-to-end encryption, ensuring that only the intended recipient can access
            your files. Our lightweight signaling server only helps establish the initial connection, but never sees or
            stores your files.
          </p>
        </section>

        <section className="bg-background/50 backdrop-blur-sm p-6 rounded-lg border shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">Key Features</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Direct peer-to-peer file transfers</li>
            <li>End-to-end encryption</li>
            <li>No file size limits (beyond browser constraints)</li>
            <li>No account required</li>
            <li>Works across different browsers and devices</li>
            <li>Resumable transfers for large files</li>
            <li>Simple, intuitive interface</li>
          </ul>
        </section>

        <section className="bg-background/50 backdrop-blur-sm p-6 rounded-lg border shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">Privacy Commitment</h2>
          <p className="text-muted-foreground">
            We're committed to privacy by design. SafeShare doesn't track your transfers, doesn't store your files, and
            doesn't require any personal information. Your data remains completely under your control at all times.
          </p>
        </section>
      </div>
    </div>
  )
}
