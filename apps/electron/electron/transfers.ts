import path from "node:path";
import type WebTorrent from "webtorrent";
import type {
    TransferResult,
    SeedResult,
    DownloadResult,
} from "../src/types/transfer";

const failure = (error: unknown) => ({
    success: false as const,
    error: error instanceof Error ? error.message : "Unknown transfer error",
});

export async function seedFile(
    client: WebTorrent,
    filePath: string,
): Promise<TransferResult<SeedResult>> {
    try {
        if (!filePath || !path.isAbsolute(filePath))
            throw new Error("Select a file on disk");
        return await new Promise((resolve, reject) => {
            const torrent = client.seed(
                filePath,
                { announce: client.tracker === false ? [] : undefined },
                (seeded) => {
                    torrent.removeListener("error", reject);
                    resolve({
                        success: true,
                        magnetUri: seeded.magnetURI,
                        infoHash: seeded.infoHash,
                    });
                },
            );
            torrent.once("error", reject);
        });
    } catch (error) {
        return failure(error);
    }
}

export async function downloadFile(
    client: WebTorrent,
    magnetUri: string,
    downloadPath: string,
): Promise<TransferResult<DownloadResult>> {
    try {
        if (!magnetUri || !path.isAbsolute(downloadPath))
            throw new Error("A torrent and download directory are required");
        return await new Promise((resolve, reject) => {
            const torrent = client.add(
                magnetUri,
                { path: downloadPath },
                (ready) => {
                    const complete = () => {
                        torrent.removeListener("error", reject);
                        resolve({
                            success: true,
                            path: path.join(downloadPath, ready.files[0].path),
                        });
                    };
                    if (ready.done) complete();
                    else ready.once("done", complete);
                },
            );
            torrent.once("error", reject);
        });
    } catch (error) {
        return failure(error);
    }
}
