/**
 * Centralized in-memory cache with expiry.
 * Cache duration is managed by CACHE_DURATION_MS.
 * Usage: await cache.getOrSet(key, asyncFn)
 */

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, durationMs: number = CACHE_DURATION_MS): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + durationMs,
    });
  }

  invalidatePrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  // Helper: get from cache or set if missing/expired
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    durationMs: number = CACHE_DURATION_MS
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await fn();
    this.set(key, value, durationMs);
    return value;
  }

  // Optional: clear cache (for testing or admin)
  clear() {
    this.store.clear();
  }
}

// Export a singleton cache instance
export const cache = new Cache();

// Export the duration for centralized management
export { CACHE_DURATION_MS };
