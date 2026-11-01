import assert from 'node:assert/strict';
import { createRequire, findPackageJSON } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

for (const app of ['web', 'electron']) {
  const appUrl = pathToFileURL(resolve(`apps/${app}/package.json`));
  const torrentPackage = findPackageJSON('webtorrent', appUrl);
  const discoveryPackage = findPackageJSON('torrent-discovery', pathToFileURL(torrentPackage));
  const trackerPackage = findPackageJSON('bittorrent-tracker', pathToFileURL(discoveryPackage));
  const trackerRequire = createRequire(trackerPackage);
  const ip = trackerRequire('ip');

  for (const address of ['127.1', '01200034567', '012.1.2.3', '000:0:0000::01', '::fFFf:127.0.0.1']) {
    let isPublic = false;
    try {
      isPublic = ip.isPublic(address);
    } catch {
      // The replacement may reject ambiguous forms instead of classifying them.
    }
    assert.equal(isPublic, false, `${app}: ${address} must not be considered public`);
  }
  assert.equal(ip.isPublic('8.8.8.8'), true);
  assert.equal(ip.toString(Buffer.from([203, 0, 113, 10])), '203.0.113.10');
  assert.deepEqual([...ip.toBuffer('203.0.113.10')], [203, 0, 113, 10]);
  console.log(`${app}: tracker IP classification and conversion checks passed`);
}
