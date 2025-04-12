import { AnimatePresence, motion } from 'framer-motion';
import { Github, Menu, Share2, Shield, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ModeToggle } from './mode-toggle';
import { Button } from './ui/button';

('use client');

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 mx-auto w-full items-center justify-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-8">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Share2 className="h-5 w-5 text-primary" />
                        </div>
                        <span className="inline-block text-lg font-bold">
                            SafeShare
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden items-center space-x-4 md:flex">
                    <nav className="flex items-center space-x-4">
                        <Link href="/about">
                            <Button variant="ghost" size="sm">
                                About
                            </Button>
                        </Link>
                        <Link href="/how-it-works">
                            <Button variant="ghost" size="sm">
                                How It Works
                            </Button>
                        </Link>
                        <Link
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                            >
                                <Github className="h-4 w-4" />
                                <span>GitHub</span>
                            </Button>
                        </Link>
                        <div className="mx-2 h-6 border-l pl-4">
                            <div className="flex items-center gap-1.5">
                                <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                    Secure Connection
                                </span>
                            </div>
                        </div>
                        <ModeToggle />
                    </nav>
                </div>

                {/* Mobile Menu Button */}
                <div className="flex items-center gap-2 md:hidden">
                    <div className="mr-2 flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            Secure
                        </span>
                    </div>
                    <ModeToggle />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t md:hidden"
                    >
                        <div className="container flex flex-col space-y-3 py-4">
                            <Link
                                href="/about"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                >
                                    About
                                </Button>
                            </Link>
                            <Link
                                href="/how-it-works"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                >
                                    How It Works
                                </Button>
                            </Link>
                            <Link
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-1.5"
                                >
                                    <Github className="h-4 w-4" />
                                    <span>GitHub</span>
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
