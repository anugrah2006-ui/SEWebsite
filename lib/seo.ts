const envSiteUrl =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://llmcostoptimizer.com';

export const defaultSite = {
  name: 'LLM Cost Optimizer',
  url: envSiteUrl,
  description:
    'Optimize your LLM costs with smart caching, model selection, and usage analytics. Reduce AI API expenses by up to 90% while maintaining quality.',
  logo: '/og.webp',
};

// Async getter which reads values from DB site_config and falls back to defaults/env
// Keep a synchronous fallback export named `site` for existing code that imports it.
// Server code should import `loadSiteMeta` from `lib/site-meta.server.ts` instead.
export const site = defaultSite;

export function buildKeywords(
  ...sets: Array<string | string[] | undefined | null>
): string[] {
  const out = new Set<string>();
  const pushToken = (raw: string) => {
    // Normalize: remove quotes, collapse whitespace, strip trailing punctuation
    const v = raw
      .replace(/["'`]+/g, '')
      // strip leading/trailing brackets/braces/parentheses
      .replace(/^[\[\(\{]+|[\]\)\}]+$/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[\.;:,]+$/g, '')
      .trim()
      .toLowerCase();
    if (!v) return;
    out.add(v);
  };
  for (const set of sets) {
    if (!set) continue;
    if (Array.isArray(set)) {
      for (const item of set) {
        if (!item) continue;
        // Split array items that may contain comma/semicolon-delimited values
        const parts = String(item).split(/[\s,;]+/);
        for (const p of parts) pushToken(p);
      }
    } else {
      const parts = String(set).split(/[\s,;]+/);
      for (const p of parts) pushToken(p);
    }
  }
  return Array.from(out);
}

export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function summarize(input: string, max = 160): string {
  const clean = stripHtml(input);
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean;
}
