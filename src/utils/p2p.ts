import * as parseTorrent from "parse-torrent";
import crypto from "crypto";
import type { TorrentInfo } from "./types.js";

/**
 * Create a magnet URI for P2P file sharing
 */
export function createMagnetUri(
  infoHash: string,
  name: string,
  size: number,
): string {
  // Generate a magnet URI without the length property.
  const magnetUri = parseTorrent.toMagnetURI({
    infoHash,
    name,
    announce: [],
  });
  // Append the file size as the 'xl' parameter.
  return `${magnetUri}&xl=${size}`;
}

/**
 * Generate an info hash for a file
 */
export function generateInfoHash(fileData: {
  name: string;
  size: number;
  sessionId: string;
}): string {
  const { name, size, sessionId } = fileData;
  return crypto
    .createHash("sha1")
    .update(`${sessionId}:${name}:${size}:${Date.now()}`)
    .digest("hex");
}

/**
 * Create a torrent info object
 */
export function createTorrentInfo(
  infoHash: string,
  magnetUri: string,
  fileMetadata: {
    name: string;
    size: number;
    type: string;
  },
): TorrentInfo {
  return {
    infoHash,
    magnetUri,
    files: [
      {
        name: fileMetadata.name,
        size: fileMetadata.size,
        type: fileMetadata.type,
      },
    ],
  };
}
