import db from './db';

export interface RunRecord {
  id: number;
  tool: string;
  status: string;
}

export async function createRun(
  tool: string,
  params: any
): Promise<RunRecord | null> {
  try {
    const [res]: any = await db.execute(
      'INSERT INTO tool_runs (tool, params_json) VALUES (?, ?)',
      [tool, JSON.stringify(params || null)]
    );
    return { id: res.insertId, tool, status: 'running' };
  } catch (e) {
    console.error('[persistence.createRun]', e);
    return null;
  }
}

export async function finishRun(
  id: number,
  status: 'success' | 'error',
  summary: any
) {
  try {
    await db.execute(
      'UPDATE tool_runs SET status=?, finished_at=NOW(), summary_json=? WHERE id=?',
      [status, JSON.stringify(summary || null), id]
    );
  } catch (e) {
    console.error('[persistence.finishRun]', e);
  }
}

export async function addRunItem(
  runId: number,
  item: { url?: string; status_code?: number; meta?: any }
) {
  try {
    await db.execute(
      'INSERT INTO tool_run_items (run_id, url, status_code, meta_json) VALUES (?, ?, ?, ?)',
      [
        runId,
        item.url || null,
        item.status_code || null,
        JSON.stringify(item.meta || null),
      ]
    );
  } catch (e) {
    console.error('[persistence.addRunItem]', e);
  }
}
