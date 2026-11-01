# Security scanning

The security workflow scans the Go backend, JavaScript/TypeScript and Actions. It also checks
both application dependency graphs and tests the tracker IP conversion/classification API.

`bittorrent-tracker@11.2.3` still depends on the unmaintained `ip@2.0.1`, which has no patched
release for CVE-2024-29415. The scoped pnpm override selects `@webpod/ip@0.6.1`, a reviewed
MIT-licensed compatible implementation with the classification fixes. Both app lockfiles pin
its published integrity. The override is limited to that tracker version and is not a blanket
suppression of dependency advisories. Reassess it when the tracker removes the old dependency.

The published tracker uses the IP conversion API in its UDP server parser; the vulnerable
`isPublic` predicate was not found in its published source. Removing the vulnerable package
still prevents future callers from relying on that incorrect predicate. Regression checks
exercise the resolved replacement in both the web and Electron dependency graphs.
