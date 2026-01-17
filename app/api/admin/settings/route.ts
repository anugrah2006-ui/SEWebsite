import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';

const SETTINGS_PATH = path.join(process.cwd(), 'lib', 'site-settings.json');
const DEFAULT_PATH = path.join(process.cwd(), 'lib', 'site-settings.default.json');

let subscribers: Array<(data: any) => void> = [];

function broadcast(data: any) {
  for (const s of subscribers) {
    try { s(data); } catch (e) { /* ignore */ }
  }
}

export async function GET() {
  try {
    const content = await fs.promises.readFile(SETTINGS_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const isAdmin = cookieStore.get('admin')?.value === '1';
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const payload = await req.json();
    await fs.promises.writeFile(SETTINGS_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    broadcast(payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = cookies();
    const isAdmin = cookieStore.get('admin')?.value === '1';
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const defaultContent = await fs.promises.readFile(DEFAULT_PATH, 'utf-8');
    await fs.promises.writeFile(SETTINGS_PATH, defaultContent, 'utf-8');
    const data = JSON.parse(defaultContent);
    broadcast(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// Export helpers for subscribe route
export const adminSettingsSubscribers = {
  subscribe: (fn: (d: any) => void) => { subscribers.push(fn); return () => { subscribers = subscribers.filter(s => s !== fn); }; }
};
