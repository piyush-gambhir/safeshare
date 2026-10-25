# Node and dependency upgrade review

Reviewed against `origin/main` at `7a7c330`, preserving the upstream security changes, application fixes, separate application lockfiles, build-script policy, and existing Next security release-age exclusions.

## Toolchain and compatibility

Development uses Node 26.12.1 and pnpm 12.15.0. Node 24.22.1 remains accepted for hosting, and CI runs both exact versions. Each app checks TypeScript 7.0.2 through the explicit `@typescript/native` npm alias. The explicit `typecheck:compat` command checks TypeScript 6.0.3, retained for Next and TypeScript ESLint compiler APIs. Backend build and watch commands explicitly select the version 7 compiler. Electron builds also select it explicitly.

Electron 45.0.0 embeds Node 24.22.0 and Chromium 156.0.8078.48. Updating the development Node version does not replace Electron's embedded runtime.

The web adapters now use the current DayPicker 10, panels 4, and Recharts 3 APIs. The backend uses Zod 4 native JSON Schema generation instead of `fastify-zod`, removing its vulnerable Zod 3 dependency while retaining registered schema references.

Desktop packaging initially completed but omitted transitive modules under the isolated pnpm layout. The workspace now uses the physical hoisted dependency layout required by the packager. All application lockfiles remain separate. Electron runtime installation is explicitly allowed. The main process's existing `electron-squirrel-startup` import now has a declared dependency. The rebuilt application launches successfully rather than merely producing a package. Its preload is emitted as CommonJS, the renderer uses context isolation and sandboxing without Node integration, and preload channel names now match the existing main-process handlers.

## Checks and observed behavior

On both Node 24.22.1 and 26.12.1, all applications passed lint, explicit TypeScript 7 and TypeScript 6 checks, and their respective Next, backend compiler, and Vite builds. Web lint retains six pre-existing warnings. No new lint suppressions were added. Frozen installation and application peer checks passed.

With disposable local Redis, the actual compiled Fastify backend passed invalid-input rejection (400), share initiation (200), torrent metadata update (200), session retrieval (200), and missing-session handling (404). Private keys were excluded from returned responses. No peer client was started for this API check.

Isolated Chromium 155 checked the production web UI: selecting a local fixture enables sharing, simulated API 503 responses recover both share and join buttons, and the about page renders. No uncaught browser errors occurred. External browser requests were blocked.

An unsigned ARM64 directory package was built with signing discovery disabled and publishing disabled. The actual packaged Electron window was reloaded with error capture installed, rendered, and local fixture selection enabled sharing with no uncaught renderer errors. Initialization and downloads-path IPC calls passed. A second check ran two actual packaged apps with disposable files and the real local Fastify backend and Redis. File selection used Electron webUtils through the preload bridge, the sender seeded and registered metadata, and the receiver downloaded a byte-identical 147,456-byte fixture. SHA-256: `3af3d8140e80b1fb6227e0382d6d28b87861adb3d5cb9010f48d402c404e21fe`. Both clients ran with `NODE_ENV=test`, disabling trackers, DHT, LSD, peer exchange, NAT mapping, uTP, and web seeds. The test injected one manual loopback peer. The local backend used wildcard CORS only for this disposable test. The renderer made requests only to the loopback backend. No uncaught renderer errors occurred.

The transfer contract now uses supported File-to-path conversion, matching typed success/failure envelopes, serializable seed metadata and download results, the selected download directory, and completion after all pieces arrive. `pnpm --filter ./apps/electron test` runs two focused tests covering an actual loopback transfer with byte comparison and invalid-input failure envelopes. Windows/Linux packages, signed installers, internet peer discovery, NAT traversal, web-to-desktop interoperability, deployed CORS configuration, and deployed hosting remain unverified.

## Security and compatible holds

Full and production audits report zero advisories for the Fastify app. Both audit scopes report one high advisory each for web and Electron: unpatched `ip@2.0.1` through latest WebTorrent 3.0.21 and bittorrent-tracker 11.2.3. No advisory is ignored.

[GHSA-2p57-rm9w-gvfp](https://github.com/advisories/GHSA-2p57-rm9w-gvfp) concerns `isPublic` address classification. Inspection of installed tracker code found its only `ip` call in `lib/server/parse-udp.js`, using `toString`, with no `isPublic` or `isPrivate` calls. The tracker's browser map excludes its server entry. This reduces the identified advisory's reachable attack path in the current clients; it does not establish general SSRF protection or remove the dependency advisory. Reassess when upstream publishes a replacement or changes these paths.

Bounded overrides update vulnerable `fast-uri`, `ip-address`, static-serving, selector-parser, and Undici dependencies. Rebuilt Electron bundles and the actual packaged application passed after the selector-parser/Undici updates. External dependency audits do not cover libraries embedded in Electron itself.

Intentional holds:

- Web ESLint 9: the current Next ESLint plugins do not support ESLint 10.
- TypeScript 6: retained as the compiler API, with version 7 checked separately.
- Web Lucide 0.487: existing GitHub/Twitter brand exports were removed in the current Lucide major.
- Electron Tailwind 3.4.19: the existing Tailwind 3/PostCSS configuration requires a separate Tailwind 4 stylesheet migration.
- Web panels 4.14.8: retains the existing release-age policy. Version 4.15.0 was published at 2026-10-24T21:32:32.360Z, with 24-hour eligibility at 2026-10-25T21:32:32.360Z. No new release-age exception was added.

The legacy unused `crypto` npm package remains deprecated. This upgrade does not certify the application's existing encryption design, full IPC exposure, or end-to-end transfer implementation.

## Evidence and release readiness

Ignored local artifacts are under `build/upgrade-evidence`: `checks.json`, numbered runtime check logs, per-app full/production audits, peer/outdated reports, frozen installation log, API/browser results, Electron package log, actual packaged runtime results, and `electron-transfer-e2e-results.json` for the full local transfer. The unsigned application is retained locally in `electron-release`. These artifacts support local review and are not portable CI evidence.

The only GitHub workflow is CI on pushes and pull requests to `main`; no publishing or deployment workflow was introduced or invoked. Desktop identity and icon remain template defaults. The repaired transfer workflow has been verified only on loopback. Template application identity, signing, cross-platform packages, and public-network behavior still require release validation. No signed release, store submission, deployment, or production service write occurred. No container configuration was changed.

Concrete gains are supported development tooling, explicit compiler coverage, compatible UI adapters, removal of the backend's vulnerable schema adapter dependency, patched transitive build dependencies, and a desktop package with a verified local transfer workflow. Runtime speed or transfer throughput gains were not benchmarked.
