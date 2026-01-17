/**
 * Minify all non-minified JS and CSS in the . folder.
 * Skips already-minified files and binary font assets.
 * Also skips traversal of node_modules and .next.
 *
 * Uses a bounded worker pool (parallel processing).
 */
import path from 'node:path';
import os from 'node:os';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import esbuild from 'esbuild';

const { transform } = esbuild;

const ROOT = path.join(process.cwd(), '.');

const SKIP_PATTERNS = [
  /\.min\./i,
  /\.map$/i,
  /\.(woff2?|ttf|eot|otf|svg)$/i,
  /\/wp-content\/cache\//i,
];

const DIR_SKIP = new Set(['node_modules', '.next']);

const CONCURRENCY = Math.min(Math.max(2, os.cpus().length), 8);

const totals = { files: 0, reducedBytes: 0, unchanged: 0, errors: 0 };

const normalizePath = (p) => p.replace(/\\/g, '/');

const shouldSkipFile = (filePath) =>
  SKIP_PATTERNS.some((re) => re.test(normalizePath(filePath)));

function isTargetFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (ext === '.js' || ext === '.css') && !shouldSkipFile(filePath);
}

async function* walkFiles(dir) {
  const base = path.basename(dir);
  if (DIR_SKIP.has(base)) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (DIR_SKIP.has(entry.name)) continue;
      yield* walkFiles(fullPath);
    } else {
      yield fullPath;
    }
  }
}

async function minifyFile(filePath) {
  if (!isTargetFile(filePath)) return;

  const ext = path.extname(filePath).toLowerCase();

  let original;
  try {
    original = await readFile(filePath, 'utf8');
  } catch {
    totals.errors += 1;
    return;
  }

  if (!original.trim()) return;

  let result;
  try {
    result = await transform(original, {
      loader: ext === '.js' ? 'js' : 'css',
      minify: true,
      legalComments: 'none',
      target: 'es2018',
    });
  } catch {
    totals.errors += 1;
    return;
  }

  const before = Buffer.byteLength(original, 'utf8');
  const after = Buffer.byteLength(result.code, 'utf8');

  if (after < before) {
    try {
      await writeFile(filePath, result.code);
      totals.files += 1;
      totals.reducedBytes += before - after;
    } catch {
      totals.errors += 1;
    }
  } else {
    totals.unchanged += 1;
  }
}

async function runPool(concurrency) {
  const iterator = walkFiles(ROOT)[Symbol.asyncIterator]();

  async function worker() {
    while (true) {
      const { value, done } = await iterator.next();
      if (done) break;
      await minifyFile(value);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

async function run() {
  const rootExists = await stat(ROOT).catch(() => null);
  if (!rootExists) {
    console.error(`. directory not found at ${ROOT}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Minifying JS and CSS under ${ROOT} with ${CONCURRENCY} workers (skipping node_modules, .next)...`
  );

  await runPool(CONCURRENCY);

  const kbSaved = (totals.reducedBytes / 1024).toFixed(1);
  console.log(
    `Done. Updated ${totals.files} file(s); unchanged ${totals.unchanged}; errors ${totals.errors}; saved ~${kbSaved} KB.`
  );

  if (totals.errors > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});