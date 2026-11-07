import type { Metadata } from 'next';

import ReceiveTransfer from '@/components/receive-transfer';

export const metadata: Metadata = {
    title: 'Receive a file - SafeShare',
    robots: { index: false, follow: false },
};

export default async function ReceivePage({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = await params;
    return (
        <main className="mx-auto w-full px-4 py-16 sm:px-6">
            <ReceiveTransfer sessionId={sessionId} />
        </main>
    );
}
