/**
 * Scans public/, downloads non-HTML sharpeconomy.org assets into existing
 * public/wp-content or public/wp-includes (or wp-content/uploads/sharpeconomy/...),
 * and rewrites HTML files to point to the local copies.
 *
 * Runs across multiple worker threads (one per CPU by default) to use multiple
 * processors. Each worker processes a subset of files and performs concurrent
 * network downloads (bounded per-worker).
 *
 * Usage: node scripts/mirror-se.mjs
 * Environment:
 *   CONCURRENCY_FILES - total desired file-parallelism (split across workers)
 *   CONCURRENCY_NET   - network concurrency per worker (default 6)
 *   WORKERS           - number of worker threads to spawn (defaults to os.cpus().length)
 */
import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import https from "https";
import http from "http";
import { URL } from "url";
import os from "os";
import { isMainThread, parentPort, workerData, Worker } from "worker_threads";

const ROOT = path.resolve("public");
const WP_CONTENT = path.join(ROOT, "wp-content");
const WP_INCLUDES = path.join(ROOT, "wp-includes");
// Use existing wp-content/uploads/sharpeconomy as fallback (do not create new top-level folder)
const FALLBACK_DIR = path.join(WP_CONTENT, "uploads", "sharpeconomy");

const TOTAL_FILE_CONCURRENCY = parseInt(process.env.CONCURRENCY_FILES, 10) || 10;
const NETWORK_CONCURRENCY_PER_WORKER = parseInt(process.env.CONCURRENCY_NET, 10) || 6;
const WORKER_COUNT = Math.max(1, parseInt(process.env.WORKERS, 10) || os.cpus().length);

class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.queue = [];
    this._boundRelease = this._release.bind(this);
  }
  acquire() {
    return new Promise((resolve) => {
      if (this.count < this.max) {
        this.count++;
        return resolve(this._boundRelease);
      }
      this.queue.push(resolve);
    });
  }
  _release() {
    this.count--;
    if (this.queue.length > 0) {
      this.count++;
      const next = this.queue.shift();
      next(this._boundRelease);
    }
  }
}

function download(urlStr, dest) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const client = u.protocol === "http:" ? http : https;
    client
      .get(u, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = new URL(res.headers.location, u);
          return resolve(download(loc.toString(), dest));
        }
        if (res.statusCode !== 200) return reject(new Error(`Failed ${urlStr} -> ${res.statusCode}`));
        const ct = (res.headers["content-type"] || "").toLowerCase();
        if (ct.includes("text/html")) return reject(new Error("Refusing to download HTML content"));
        fsp
          .mkdir(path.dirname(dest), { recursive: true })
          .then(() => {
            const stream = fs.createWriteStream(dest);
            res.pipe(stream);
            stream.on("finish", () => resolve());
            stream.on("error", reject);
            res.on("error", reject);
          })
          .catch(reject);
      })
      .on("error", reject);
  });
}

function chooseLocalPaths(uPath) {
  // Normalize and remove leading slash
  let pathname = decodeURIComponent(uPath || "");
  if (pathname.startsWith("/")) pathname = pathname.slice(1);
  if (!pathname) return null;
  const lower = pathname.toLowerCase();

  // If remote path already under wp-content/wp-includes (or misspelled wp-inludes),
  // store under the same path in public/
  if (lower.startsWith("wp-content/") || lower.startsWith("wp-includes/") || lower.startsWith("wp-inludes/")) {
    const localPath = path.join(ROOT, pathname);
    const publicPath = "/" + pathname.split(path.sep).join("/");
    return { localPath, publicPath };
  }

  // Otherwise place into existing wp-content/uploads/sharpeconomy/<pathname>
  const rel = path.posix.join("wp-content", "uploads", "sharpeconomy", pathname.split(path.posix.sep).join("/"));
  const localPath = path.join(ROOT, ...rel.split("/"));
  const publicPath = "/" + rel.split(path.sep).join("/");
  return { localPath, publicPath };
}

async function ensureAssetFactory(netConcurrency) {
  const urlCache = new Map();
  const netSem = new Semaphore(netConcurrency);

  return async function ensureAsset(urlStr) {
    if (urlCache.has(urlStr)) return urlCache.get(urlStr);
    const p = (async () => {
      try {
        const u = new URL(urlStr);
        if (!u.hostname.includes("sharpeconomy.org")) return null;
        const ext = path.extname(u.pathname).toLowerCase();
        if (ext === ".html" || ext === ".htm" || u.pathname.endsWith("/")) {
          // do not download HTML or directory URLs
          return null;
        }
        const chosen = chooseLocalPaths(u.pathname);
        if (!chosen) return null;
        const { localPath, publicPath } = chosen;

        try {
          await fsp.access(localPath);
        } catch {
          await fsp.mkdir(path.dirname(localPath), { recursive: true });
          const release = await netSem.acquire();
          try {
            await download(urlStr, localPath);
          } finally {
            release();
          }
        }
        return publicPath;
      } catch (e) {
        return null;
      }
    })();

    urlCache.set(urlStr, p);
    p.catch(() => urlCache.delete(urlStr));
    return p;
  };
}

async function replaceInFileFactory(ensureAsset) {
  return async function replaceInFile(file) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== ".html" && ext !== ".htm") return;
    let content = await fsp.readFile(file, "utf8");
    const regex = /https?:\/\/sharpeconomy\.org\/[^\s"'<>)]*/g;
    const matches = Array.from(new Set(content.match(regex) || []));
    if (matches.length === 0) return;
    const results = await Promise.all(
      matches.map(async (url) => {
        try {
          const local = await ensureAsset(url);
          return { url, local };
        } catch {
          return { url, local: null };
        }
      })
    );
    for (const { url, local } of results) {
      if (local) {
        const esc = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        content = content.replace(new RegExp(esc, "g"), local);
      }
    }
    await fsp.writeFile(file, content, "utf8");
    return file;
  };
}

async function walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => {
      const res = path.resolve(dir, e.name);
      return e.isDirectory() ? walk(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

async function pMap(inputs, mapper, concurrency) {
  const results = new Array(inputs.length);
  let i = 0;
  const workers = new Array(Math.min(concurrency, inputs.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= inputs.length) break;
      results[idx] = await mapper(inputs[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

if (isMainThread) {
  (async () => {
    try {
      const all = await walk(ROOT);
      const htmlFiles = all.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return ext === ".html" || ext === ".htm";
      });
      if (htmlFiles.length === 0) {
        console.log("No HTML files found under public/");
        return;
      }

      const workersToSpawn = Math.min(WORKER_COUNT, htmlFiles.length);
      const filesPerWorker = Math.ceil(htmlFiles.length / workersToSpawn);
      const workers = [];
      let finished = 0;
      for (let i = 0; i < workersToSpawn; i++) {
        const start = i * filesPerWorker;
        const slice = htmlFiles.slice(start, start + filesPerWorker).map((p) => path.resolve(p));
        // Use URL object for worker path to satisfy Worker constructor requirements
        const w = new Worker(new URL(import.meta.url), {
          workerData: {
            files: slice,
            networkConcurrency: NETWORK_CONCURRENCY_PER_WORKER,
            fileConcurrency: Math.max(1, Math.ceil(TOTAL_FILE_CONCURRENCY / workersToSpawn)),
          },
          type: "module",
        });
        w.on("message", (msg) => {
          if (msg && msg.type === "updated") console.log("Worker updated:", msg.file);
          if (msg && msg.type === "log") console.log("Worker:", msg.msg);
        });
        w.on("error", (err) => console.error("Worker error:", err));
        w.on("exit", (code) => {
          finished++;
          if (code !== 0) console.error("Worker exited with code", code);
          if (finished === workersToSpawn) {
            console.log("All workers finished.");
          }
        });
        workers.push(w);
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
} else {
  // Worker thread: process assigned files
  (async () => {
    try {
      const files = (workerData && workerData.files) || [];
      const netConcurrency = workerData.networkConcurrency || NETWORK_CONCURRENCY_PER_WORKER;
      const fileConcurrency = workerData.fileConcurrency || 1;

      const ensureAsset = await ensureAssetFactory(netConcurrency);
      const replaceInFile = await replaceInFileFactory(ensureAsset);

      await pMap(
        files,
        async (file) => {
          try {
            const res = await replaceInFile(file);
            if (parentPort) parentPort.postMessage({ type: "updated", file: res });
          } catch (e) {
            if (parentPort) parentPort.postMessage({ type: "log", msg: `error processing ${file}: ${e && e.message}` });
          }
        },
        fileConcurrency
      );

      if (parentPort) parentPort.postMessage({ type: "log", msg: "worker done" });
      process.exit(0);
    } catch (err) {
      if (parentPort) parentPort.postMessage({ type: "log", msg: `worker error: ${err && err.message}` });
      process.exit(1);
    }
  })();
}