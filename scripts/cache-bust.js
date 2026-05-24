#!/usr/bin/env node
/**
 * cache-bust.js — rewrites ?v=<hash> on every CSS/JS asset link in
 * the project's HTML files so browsers re-fetch when an asset
 * actually changes.
 *
 * Hash strategy: short MD5 of the file *contents*. Two consequences:
 *   - If style.css changes, only style.css gets a new ?v — js files
 *     keep their cached version (efficient).
 *   - If nothing changed, the ?v string is identical to last time,
 *     so this script is idempotent (safe to run on every commit).
 *
 * Run with:  npm run cache-bust
 * Or wire to a git pre-commit hook (see scripts/git-hooks/pre-commit).
 *
 * Prefer a timestamp instead? Replace `hashFile(fsPath)` with
 * `Date.now()` — easier to read in diffs but invalidates every cache
 * even when no asset changed.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const HTML_FILES = [
  'index.html',
  'team/index.html',
  'research/index.html',
  'publications/index.html',
  'news/index.html',
  'contact/index.html',
];

// Matches:   href="/css/foo.css"           src="/js/foo.js?v=oldhash"
// Captures the attribute name (group 1) and the asset path (group 2)
// so we can preserve them while replacing/adding the ?v= suffix.
const ASSET_RE = /(href|src)="(\/(?:css|js)\/[^"?]+)(?:\?v=[^"]*)?"/g;

function hashFile(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex').slice(0, 10);
}

let bumpedCount = 0;
const bumpedAssets = new Set();

for (const rel of HTML_FILES) {
  const htmlPath = path.join(ROOT, rel);
  if (!fs.existsSync(htmlPath)) {
    console.warn('skip (missing):', rel);
    continue;
  }

  const original = fs.readFileSync(htmlPath, 'utf8');
  let fileChanged = false;

  const updated = original.replace(ASSET_RE, (match, attr, assetPath) => {
    const fsPath = path.join(ROOT, assetPath);
    if (!fs.existsSync(fsPath)) return match; // missing or external — leave alone
    const v = hashFile(fsPath);
    const out = `${attr}="${assetPath}?v=${v}"`;
    if (out !== match) {
      fileChanged = true;
      bumpedAssets.add(`${assetPath} → v=${v}`);
    }
    return out;
  });

  if (fileChanged) {
    fs.writeFileSync(htmlPath, updated);
    bumpedCount++;
    console.log('bumped:', rel);
  }
}

if (bumpedCount === 0) {
  console.log('No changes — every ?v= is already current.');
} else {
  console.log(`\n${bumpedCount} HTML file(s) updated. Asset versions now:`);
  for (const a of bumpedAssets) console.log('  ' + a);
}
