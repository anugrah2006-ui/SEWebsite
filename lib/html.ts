// Lightweight HTML parsing helpers (regex based) used across tools
// Intentionally simple; can be swapped with a DOM parser later without changing call sites.

export interface ExtractLinksOptions {
  sameOriginOnly?: boolean;
  origin?: string;
  stripFragments?: boolean;
}

export function extractLinks(
  html: string,
  base: string,
  opts: ExtractLinksOptions = {}
) {
  const links = new Set<string>();
  const { sameOriginOnly = false, stripFragments = true } = opts;
  let origin: string | undefined = opts.origin;
  try {
    origin = origin || new URL(base).origin;
  } catch {}
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi)) {
    try {
      const u = new URL(m[1], base);
      if (stripFragments) u.hash = '';
      if (!sameOriginOnly || (origin && u.origin === origin)) {
        links.add(u.toString());
      }
    } catch {}
  }
  return [...links];
}

export function extractCanonical(html: string, base: string) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!m) return null;
  const hrefMatch = m[0].match(/href=["']([^"']+)["']/i);
  if (!hrefMatch) return null;
  try {
    return new URL(hrefMatch[1], base).toString();
  } catch {
    return null;
  }
}

export function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractAnchors(html: string, url: string) {
  // return array of {href,text}
  const out: { href: string; text: string }[] = [];
  for (const m of html.matchAll(
    /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  )) {
    try {
      const u = new URL(m[1], url);
      const text = m[2]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
      out.push({ href: u.toString().replace(/#.*$/, ''), text });
    } catch {}
  }
  return out;
}
