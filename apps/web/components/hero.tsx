'use client';

import { motion } from 'framer-motion';
import { Server, Shield, Zap } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

import { Badge } from './ui/badge';
import { Button } from './ui/button';

export default function Hero() {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: 'easeOut' },
        },
    };

    return (
        <div className="relative overflow-hidden">
            {/* Background gradient */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-background"></div>

            {/* Animated circles */}
            <div className="animate-blob absolute top-20 left-1/4 h-72 w-72 rounded-full bg-primary/10 opacity-50 blur-3xl"></div>
            <div className="animate-blob animation-delay-2000 absolute top-40 right-1/4 h-72 w-72 rounded-full bg-secondary/10 opacity-50 blur-3xl"></div>
            <div className="animate-blob animation-delay-4000 absolute bottom-20 left-1/3 h-72 w-72 rounded-full bg-primary/10 opacity-50 blur-3xl"></div>

            <motion.div
                ref={ref}
                variants={container}
                initial="hidden"
                animate={inView ? 'show' : 'hidden'}
                className="relative z-10 flex flex-col items-center space-y-8 px-4 py-12 text-center md:py-20"
            >
                <motion.div variants={item}>
                    <Badge variant="outline" className="px-3 py-1 text-sm">
                        Secure • Private • Fast
                    </Badge>
                </motion.div>

                <motion.h1
                    variants={item}
                    className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-4xl leading-tight font-extrabold tracking-tight text-transparent sm:text-5xl md:text-6xl dark:from-primary dark:to-blue-400"
                >
                    SafeShare
                    <span className="mt-2 block text-lg font-medium text-foreground sm:text-xl md:text-2xl">
                        Secure Peer-to-Peer File Transfer
                    </span>
                </motion.h1>

                <motion.p
                    variants={item}
                    className="max-w-[700px] text-lg leading-relaxed text-muted-foreground sm:text-xl"
                >
                    Secure, decentralized file sharing directly between
                    browsers.
                    <span className="mt-2 block">
                        No uploads, no servers, just peer-to-peer transfers.
                    </span>
                </motion.p>

                <motion.div
                    variants={item}
                    className="mt-6 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6"
                >
                    <div className="flex flex-col items-center rounded-lg border bg-background/50 p-4 backdrop-blur-sm transition-all hover:shadow-md">
                        <Shield className="mb-2 h-8 w-8 text-primary" />
                        <h3 className="font-medium">End-to-End Encrypted</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your files remain private and secure
                        </p>
                    </div>

                    <div className="flex flex-col items-center rounded-lg border bg-background/50 p-4 backdrop-blur-sm transition-all hover:shadow-md">
                        <Zap className="mb-2 h-8 w-8 text-primary" />
                        <h3 className="font-medium">Lightning Fast</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Direct transfers with no middleman
                        </p>
                    </div>

                    <div className="flex flex-col items-center rounded-lg border bg-background/50 p-4 backdrop-blur-sm transition-all hover:shadow-md">
                        <Server className="mb-2 h-8 w-8 text-primary" />
                        <h3 className="font-medium">No Storage</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Files never touch our servers
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    variants={item}
                    className="mt-4 flex flex-col gap-4 sm:flex-row"
                >
                    <Button
                        size="lg"
                        className="group relative overflow-hidden rounded-full px-8"
                    >
                        <span className="group-hover:animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0"></span>
                        Get Started
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="rounded-full px-8"
                    >
                        Learn More
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
}
