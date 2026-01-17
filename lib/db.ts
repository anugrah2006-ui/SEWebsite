import mysql from 'mysql2/promise';
import { cache as memoryCache, CACHE_DURATION_MS } from './cache';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blog_jobs_db',
  // mysql2 expects charset name (not collation)
  charset: (process.env.DB_CHARSET as string) || 'utf8mb4',
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 30000), // Increased from 5000 to 30000ms
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true, // Enable TCP keep-alive
  keepAliveInitialDelay: 0, // Start keep-alive probes immediately
});

// Ensure connection uses utf8mb4 for full Unicode (emoji) support
// This runs once on module import and applies to the pool's default session
// We set names and the common connection character set variables and collation.
void pool
  .query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'")
  .catch(() => {
    /* ignore init failure; callers will handle errors */
  });
void pool
  .query(
    "SET character_set_client = 'utf8mb4', character_set_connection = 'utf8mb4', character_set_results = 'utf8mb4'"
  )
  .catch(() => {
    /* ignore init failure */
  });

// Health check function to verify database connectivity
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('[db] Health check failed:', error);
    return false;
  }
}

// Helper function to execute queries with retry logic for timeout errors
export async function executeWithRetry(
  sql: string,
  values?: any[],
  maxRetries = Number(process.env.DB_MAX_RETRIES || 2)
): Promise<any> {
  let lastError: any;
  const slowThreshold = Number(process.env.DB_SLOW_QUERY_MS || 2000);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    try {
      const result = await pool.execute(sql, values);
      const duration = Date.now() - start;
      if (duration > slowThreshold) {
        console.warn(
          `[db] slow query (${duration}ms) attempt=${attempt} sql="${sql.split('\n').join(' ').slice(0, 180)}"`
        );
      }
      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      lastError = error;
      if (error.code === 'ETIMEDOUT') {
        console.warn(
          `[db] timeout after ${duration}ms on attempt ${attempt} sql="${sql.split('\n').join(' ').slice(0, 120)}"`
        );
      }
      // Retry only on timeout network read errors
      if (error.code === 'ETIMEDOUT' && attempt < maxRetries) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Convenience helper to migrate existing db.execute usages selectively without massive refactors.
export async function safeExecute(sql: string, values?: any[]) {
  return executeWithRetry(sql, values);
}

// Cached SELECT executor: caches results by SQL + values key
export async function cachedExecute(
  sql: string,
  values?: any[],
  durationMs: number = CACHE_DURATION_MS
): Promise<any> {
  const isSelect = /^\s*select/i.test(sql);
  // Only cache SELECT queries
  if (!isSelect) return executeWithRetry(sql, values);
  const keyBase = `${sql}`.replace(/\s+/g, ' ').trim();
  const keyVals = values ? JSON.stringify(values) : '';
  const cacheKey = `db:select:${keyBase}:${keyVals}`;
  const cached = memoryCache.get<any>(cacheKey);
  if (cached !== undefined) return cached;
  const result = await executeWithRetry(sql, values);
  memoryCache.set(cacheKey, result, durationMs);
  return result;
}

export default pool;
