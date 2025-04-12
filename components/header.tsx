"use client";

import { useState } from "react";
import Link from "next/link";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import { Share2, Shield, Github, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 items-center justify-center mx-auto">
            <div className="px-8 flex h-16 items-center justify-between">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                            <Share2 className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-bold text-lg inline-block">
                            SafeShare
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4">
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
                        <div className="border-l h-6 mx-2 pl-4">
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
                <div className="flex md:hidden items-center gap-2">
                    <div className="flex items-center gap-1.5 mr-2">
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
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden border-t"
                    >
                        <div className="container py-4 flex flex-col space-y-3">
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
