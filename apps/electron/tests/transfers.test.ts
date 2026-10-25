import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import test from "node:test";
import WebTorrent from "webtorrent";
import { seedFile, downloadFile } from "../electron/transfers.ts";

const localOptions = {
    dht: false,
    tracker: false,
    lsd: false,
    utPex: false,
    natUpnp: false,
    natPmp: false,
    utp: false,
    webSeeds: false,
};

test(
    "seed and download return serializable results after a loopback transfer",
    { timeout: 30000 },
    async () => {
        const directory = await mkdtemp(
            path.join(process.cwd(), "node_modules/.safeshare-transfer-"),
        );
        const sender = new WebTorrent(localOptions);
        const receiver = new WebTorrent(localOptions);
        try {
            const input = path.join(directory, "fixture.txt");
            const bytes = Buffer.from("SafeShare local fixture\n".repeat(4096));
            await writeFile(input, bytes);
            if (!sender.listening) await once(sender, "listening");
            const seeded = await seedFile(sender, input);
            assert.equal(seeded.success, true);
            if (!seeded.success) throw new Error(seeded.error);
            assert.match(seeded.infoHash, /^[a-f0-9]{40}$/);
            assert(!seeded.magnetUri.includes("tr="));
            receiver.once("add", (torrent) => {
                torrent.once("infoHash", () =>
                    torrent.addPeer(`127.0.0.1:${sender.torrentPort}`),
                );
            });
            const downloaded = await downloadFile(
                receiver,
                seeded.magnetUri,
                path.join(directory, "received"),
            );
            assert.equal(downloaded.success, true);
            if (!downloaded.success) throw new Error(downloaded.error);
            assert.deepEqual(await readFile(downloaded.path), bytes);
            assert.deepEqual(JSON.parse(JSON.stringify(seeded)), seeded);
            assert.deepEqual(
                JSON.parse(JSON.stringify(downloaded)),
                downloaded,
            );
        } finally {
            await Promise.all(
                [sender, receiver].map(
                    (client) =>
                        new Promise<void>((resolve) =>
                            client.destroy(() => resolve()),
                        ),
                ),
            );
            await rm(directory, { recursive: true, force: true });
        }
    },
);

test("invalid file and download paths return failure envelopes", async () => {
    const client = new WebTorrent(localOptions);
    try {
        assert.deepEqual(await seedFile(client, ""), {
            success: false,
            error: "Select a file on disk",
        });
        assert.deepEqual(await downloadFile(client, "", "relative"), {
            success: false,
            error: "A torrent and download directory are required",
        });
    } finally {
        await new Promise<void>((resolve) => client.destroy(() => resolve()));
    }
});
