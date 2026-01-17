import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = String(body.password || '');

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpass';

    if (password === ADMIN_PASSWORD) {
      const res = NextResponse.json({ ok: true });
      const cookieStore = cookies();
      // set simple cookie flag
      res.cookies.set({ name: 'admin', value: '1', httpOnly: true, path: '/' });
      return res;
    }

    return NextResponse.json({ ok: false }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = cookies();
  const isAdmin = cookieStore.get('admin')?.value === '1';
  return NextResponse.json({ ok: isAdmin });
}
