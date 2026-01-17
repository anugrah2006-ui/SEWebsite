import { site } from '@/lib/seo';
import fs from 'fs/promises';
import path from 'path';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY_FILENAME = '47f2e5bfccc040719994fc1bea8c9fd9.txt';

async function getBaseUrl() {
  const base = (site.url || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  if (!base)
    throw new Error('Base URL not configured (site.url or NEXTAUTH_URL)');
  return base;
}

async function getIndexNowKey() {
  const key = KEY_FILENAME.replace(/\.txt$/i, '');
  const filePath = path.join(process.cwd(), 'public', KEY_FILENAME);
  const content = await fs.readFile(filePath, 'utf8');
  if (content.trim() !== key)
    throw new Error('IndexNow key file content mismatch');
  return { key, keyLocation: `/${KEY_FILENAME}` };
}

export async function indexNowSubmitUrls(urls: string[]) {
  if (!urls || urls.length === 0) return { submitted: 0, ok: true };
  try {
    const base = await getBaseUrl();
    const { key, keyLocation } = await getIndexNowKey();
    const host = new URL(base).hostname;

    const body = {
      host,
      key,
      keyLocation: `${base}${keyLocation}`,
      urlList: urls,
    };
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { submitted: urls.length, ok: res.ok, status: res.status };
  } catch (e) {
    // Do not throw to avoid blocking primary flows
    console.error('[indexnow] submit failed:', e);
    return { submitted: 0, ok: false, error: (e as Error).message };
  }
}
