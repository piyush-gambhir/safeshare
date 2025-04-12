import { Github, Heart, Shield, Twitter } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t bg-muted/30 py-8">
            <div className="grid gap-8 px-8 md:grid-cols-2 lg:grid-cols-4">
                <div>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                        <Shield className="h-5 w-5 text-primary" />
                        SafeShare
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Secure, decentralized file sharing with end-to-end
                        encryption and no server storage.
                    </p>
                </div>

                <div className="md:ml-auto">
                    <h3 className="mb-4 text-sm font-semibold tracking-wider uppercase">
                        Resources
                    </h3>
                    <ul className="space-y-2 text-sm">
                        <li>
                            <Link
                                href="/about"
                                className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                                About
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/how-it-works"
                                className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                                How It Works
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/privacy"
                                className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Privacy Policy
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/terms"
                                className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Terms of Service
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="mb-4 text-sm font-semibold tracking-wider uppercase">
                        Connect
                    </h3>
                    <ul className="space-y-2 text-sm">
                        <li>
                            <Link
                                href="https://github.com"
                                className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Github className="h-4 w-4" />
                                <span>GitHub</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="https://twitter.com"
                                className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Twitter className="h-4 w-4" />
                                <span>Twitter</span>
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="mb-4 text-sm font-semibold tracking-wider uppercase">
                        Legal
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        SafeShare respects your privacy. We don&apos;t track
                        your transfers or store your files. All data remains
                        under your control at all times.
                    </p>
                </div>
            </div>

            <div className="mt-8 border-t px-8 pt-8">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} SafeShare. All rights
                        reserved.
                    </p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        Made with{' '}
                        <Heart className="h-3 w-3 fill-red-500 text-red-500" />{' '}
                        for privacy
                    </p>
                </div>
            </div>
        </footer>
    );
}
