import db, { executeWithRetry } from './db';
import { cache as memoryCache, CACHE_DURATION_MS } from './cache';

export type SiteConfig = Record<string, string | null>;

export async function ensureSiteConfigTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_config (
      name VARCHAR(191) NOT NULL PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function loadSiteConfig(force = false): Promise<SiteConfig> {
  const cacheKey = 'site-config:all';
  if (!force) {
    const cached = memoryCache.get<SiteConfig>(cacheKey);
    if (cached !== undefined) return cached;
  }
  try {
    await ensureSiteConfigTable();
    const [rows] = (await executeWithRetry(
      'SELECT `name`, `value` FROM site_config'
    )) as any;
    const out: SiteConfig = {};
    for (const r of rows) {
      out[r.name] = r.value;
    }
    // store in centralized in-memory cache
    memoryCache.set(cacheKey, out, CACHE_DURATION_MS);
    return out;
  } catch (err) {
    console.error('[site-config] load failed', err);
    return {};
  }
}

export async function getSiteConfig(key: string): Promise<string | null> {
  const cfg = await loadSiteConfig();
  return cfg[key] ?? null;
}

export async function setSiteConfig(key: string, value: string) {
  try {
    await ensureSiteConfigTable();
    await executeWithRetry(
      `INSERT INTO site_config (name, value, updated_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
      [key, value]
    );
    // invalidate cache and reload into memory cache
    await loadSiteConfig(true);
    return true;
  } catch (err) {
    console.error('[site-config] setSiteConfig failed', err);
    return false;
  }
}

export async function getAllSiteConfig(): Promise<SiteConfig> {
  return await loadSiteConfig();
}
