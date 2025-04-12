import type { Metadata } from 'next';

import FileTransfer from '@/components/file-transfer';
import Hero from '@/components/hero';

export const metadata: Metadata = {
    title: 'SafeShare - Secure P2P File Transfer',
    description:
        'Secure, decentralized, browser-based file sharing with direct peer-to-peer transfers',
    keywords: [
        'file sharing',
        'p2p',
        'peer-to-peer',
        'secure',
        'encrypted',
        'webrtc',
        'no upload',
    ],
    authors: [{ name: 'SafeShare Team' }],
    openGraph: {
        title: 'SafeShare - Secure P2P File Transfer',
        description:
            'Secure, decentralized, browser-based file sharing with direct peer-to-peer transfers',
        type: 'website',
    },
};

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between">
            <div className="w-full">
                <Hero />
                <div className="mx-auto px-4 pb-24 sm:px-6">
                    <FileTransfer />
                </div>
            </div>
        </main>
    );
}
