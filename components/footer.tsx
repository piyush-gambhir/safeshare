import Link from "next/link"
import { Github, Twitter, Shield, Heart } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t py-8 bg-muted/30">
      <div className="px-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            SafeShare
          </h3>
          <p className="text-sm text-muted-foreground">
            Secure, decentralized file sharing with end-to-end encryption and no server storage.
          </p>
        </div>

        <div className="md:ml-auto">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Resources</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Connect</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="https://github.com"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
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
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
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
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Legal</h3>
          <p className="text-xs text-muted-foreground">
            SafeShare respects your privacy. We don't track your transfers or store your files. All data remains under
            your control at all times.
          </p>
        </div>
      </div>

      <div className="px-8 mt-8 pt-8 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SafeShare. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> for privacy
          </p>
        </div>
      </div>
    </footer>
  )
}
