// Simple concurrency pool wrapper around native fetch
// Allows setting a global default concurrency and per-request timeout.

const DEFAULT_CONCURRENCY = Number(process.env.TOOLS_FETCH_CONCURRENCY || 5);
const DEFAULT_TIMEOUT_MS = Number(process.env.TOOLS_FETCH_TIMEOUT_MS || 10000);

class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;
  constructor(private limit: number) {}
  acquire(): Promise<() => void> {
    return new Promise((res) => {
      const tryAcquire = () => {
        if (this.active < this.limit) {
          this.active++;
          res(() => this.release());
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }
  release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

const sem = new Semaphore(DEFAULT_CONCURRENCY);

export interface FetchResult {
  url: string;
  ok: boolean;
  status: number;
  finalUrl: string;
  redirected: boolean;
  durationMs: number;
  error?: string;
  text?: () => Promise<string>;
  headers?: Headers;
}

export interface FetchWithPoolOptions extends RequestInit {
  timeoutMs?: number;
  returnBody?: boolean; // if true expose text() function
}

export function fetchWithPool(
  url: string,
  opts: FetchWithPoolOptions = {}
): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return sem.acquire().then(async (release) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      const durationMs = Date.now() - started;
      const finalUrl = res.url || url;
      const base: FetchResult = {
        url,
        ok: res.ok,
        status: res.status,
        finalUrl,
        redirected: finalUrl !== url,
        durationMs,
        headers: res.headers,
      };
      if (opts.returnBody) {
        const buffer = await res.text(); // note: consumes body
        clearTimeout(timer);
        release();
        return { ...base, text: async () => buffer };
      }
      clearTimeout(timer);
      release();
      return base;
    } catch (e: any) {
      const durationMs = Date.now() - started;
      clearTimeout(timer);
      release();
      return {
        url,
        ok: false,
        status: 0,
        finalUrl: url,
        redirected: false,
        durationMs,
        error: e.message,
      };
    }
  });
}

export function setFetcherConcurrency(n: number) {
  // Not dynamically adjustable with p-limit instance; would need recreation.
  // Provided for future enhancement.
  (global as any).__UNUSED = n;
}
