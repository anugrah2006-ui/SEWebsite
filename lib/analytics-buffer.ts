import db from './db';

export type ViewEvent = {
  article_id?: number | null;
  ip?: string | null;
  user_agent?: string | null;
  referrer?: string | null;
  created_at?: string | null;
  user_id?: number | null;
};

const BUFFER_LIMIT = 1000;
const FLUSH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

let buffer: ViewEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let flushing = false;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush().catch((err) =>
      console.error('[analytics-buffer] scheduled flush failed', err)
    );
  }, FLUSH_INTERVAL_MS);
}

export async function flush() {
  if (flushing) return;
  if (buffer.length === 0) return;
  flushing = true;

  const toInsert = buffer.splice(0, buffer.length);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  try {
    const placeholders = toInsert.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const sql = `INSERT INTO article_view_events (article_id, ip, user_agent, referrer, created_at, user_id) VALUES ${placeholders}`;
    const params: any[] = [];
    for (const ev of toInsert) {
      // Sanitize and truncate fields to fit DB column sizes to avoid INSERT failures
      // ip: VARCHAR(45) in DDL (IPv6 fits within 45 chars)
      // user_agent: VARCHAR(1024), referrer: VARCHAR(2048)
      const ip = ev.ip == null ? null : String(ev.ip).slice(0, 45);
      const user_agent =
        ev.user_agent == null ? null : String(ev.user_agent).slice(0, 1024);
      const referrer =
        ev.referrer == null ? null : String(ev.referrer).slice(0, 2048);
      // Optionally log if truncation happened (minimal/noisy)
      if (ev.ip && String(ev.ip).length > 45) {
        console.warn('[analytics-buffer] truncated ip to 45 chars');
      }
      if (ev.user_agent && String(ev.user_agent).length > 1024) {
        console.warn('[analytics-buffer] truncated user_agent to 1024 chars');
      }
      if (ev.referrer && String(ev.referrer).length > 2048) {
        console.warn('[analytics-buffer] truncated referrer to 2048 chars');
      }

      params.push(
        ev.article_id ?? null,
        ip,
        user_agent,
        referrer,
        ev.created_at ?? null,
        ev.user_id ?? null
      );
    }
    if (params.length > 0) {
      await (db as any).execute(sql, params);
    }
  } catch (err) {
    console.error('[analytics-buffer] flush failed, re-queueing', err);
    // Put failed batch back to front
    buffer = [...toInsert, ...buffer];
  } finally {
    flushing = false;
  }
}

export function enqueueViewEvent(ev: ViewEvent) {
  buffer.push(ev);
  if (buffer.length >= BUFFER_LIMIT) {
    void flush();
    return;
  }
  scheduleFlush();
}

// Best-effort flush on graceful shutdown
if (typeof process !== 'undefined' && process && (process as any).on) {
  (process as any).on('beforeExit', () => {
    if (flushTimer) clearTimeout(flushTimer);
    try {
      void flush();
    } catch {}
  });
}
