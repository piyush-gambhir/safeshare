'use client';

import { useEffect, useRef } from 'react';

interface QRCodeProps {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    logoUrl?: string;
}

export default function QRCode({
    value,
    size = 200,
    bgColor = '#ffffff',
    fgColor = '#000000',
    logoUrl,
}: QRCodeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Import QRCode.js dynamically
        import('qrcode').then((QRCode: any) => {
            QRCode.toCanvas(
                canvasRef.current,
                value,
                {
                    width: size,
                    margin: 1,
                    color: {
                        dark: fgColor,
                        light: bgColor,
                    },
                    errorCorrectionLevel: 'H', // High - allows for logo overlay
                },
                async (error: Error | null) => {
                    if (error) {
                        console.error('Error generating QR code:', error);
                        return;
                    }

                    // If a logo URL is provided, add it to the center of the QR code
                    if (logoUrl && canvasRef.current) {
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');

                        if (ctx) {
                            const logo = new Image();
                            logo.crossOrigin = 'anonymous';

                            logo.onload = () => {
                                // Calculate logo size (25% of QR code)
                                const logoSize = size * 0.25;
                                const logoX = (size - logoSize) / 2;
                                const logoY = (size - logoSize) / 2;

                                // Draw white background for logo
                                ctx.fillStyle = bgColor;
                                ctx.fillRect(
                                    logoX - 5,
                                    logoY - 5,
                                    logoSize + 10,
                                    logoSize + 10,
                                );

                                // Draw logo
                                ctx.drawImage(
                                    logo,
                                    logoX,
                                    logoY,
                                    logoSize,
                                    logoSize,
                                );
                            };

                            logo.src = logoUrl;
                        }
                    }
                },
            );
        });
    }, [value, size, bgColor, fgColor, logoUrl]);

    return (
        <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="rounded-lg shadow-sm"
        />
    );
}
