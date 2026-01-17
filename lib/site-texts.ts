import db from './db';

export async function ensureSiteTextsTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_texts (
      name VARCHAR(191) NOT NULL PRIMARY KEY,
      content TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function getSiteText(
  name: string
): Promise<{ content: string | null; updated_at: string | null } | null> {
  try {
    const [rows] = (await db.execute(
      'SELECT content, updated_at FROM site_texts WHERE name = ? LIMIT 1',
      [name]
    )) as any;
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      content: r.content,
      updated_at: r.updated_at?.toISOString?.() ?? r.updated_at ?? null,
    };
  } catch (err) {
    console.error('[site-texts] getSiteText failed', err);
    return null;
  }
}

export async function setSiteText(name: string, content: string) {
  try {
    await ensureSiteTextsTable();
    await db.execute(
      `INSERT INTO site_texts (name, content, updated_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = NOW()`,
      [name, content]
    );
    return true;
  } catch (err) {
    console.error('[site-texts] setSiteText failed', err);
    return false;
  }
}
