import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Helper to verify password from header
const verifyAuth = (req: NextRequest) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return false;
  }
  return true;
};

export async function GET(req: NextRequest) {
  try {
    const [rows] = await db.execute('SELECT section_key, content FROM site_content');
    const contentMap: Record<string, any> = {};
    (rows as any[]).forEach((row) => {
      contentMap[row.section_key] = row.content;
    });
    return NextResponse.json(contentMap);
  } catch (error) {
    console.error('Failed to fetch content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, content } = body;

    if (!key || !content) {
      return NextResponse.json({ error: 'Missing key or content' }, { status: 400 });
    }

    await db.execute(
      `INSERT INTO site_content (section_key, content)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content)`,
      [key, JSON.stringify(content)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update content:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    await db.execute('DELETE FROM site_content WHERE section_key = ?', [key]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete content:', error);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}
