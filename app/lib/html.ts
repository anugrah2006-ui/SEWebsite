import path from 'node:path';
import { promises as fs } from 'node:fs';
import { cache } from 'react';

export type LoadedHtml = {
  head: string;
  body: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  bodyAttributes: Record<string, string>;
  filePath: string;
};

const PUBLIC_DIR = path.join(process.cwd(), 'public');

const decodeEntities = (value: string | null | undefined) =>
  value
    ? value
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
    : null;

async function fileExists(fullPath: string) {
  try {
    const stats = await fs.stat(fullPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function buildCandidates(slug: string[]) {
  const normalized = slug.filter(Boolean);
  const joined = normalized.join(path.sep);
  const candidates = new Set<string>();

  if (!joined) {
    candidates.add('index.html');
  } else {
    const hasExtension = path.extname(joined) !== '';
    if (hasExtension) {
      candidates.add(joined);
    }

    candidates.add(path.join(joined, 'index.html'));

    if (!hasExtension) {
      candidates.add(`${joined}.html`);
    }
  }

  return [...candidates];
}

function extractSection(html: string, tag: 'head' | 'body') {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = html.match(regex);
  return match?.[1] ?? null;
}

function extractTitle(head: string) {
  const match = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeEntities(match?.[1] ?? null);
}

function extractMetaContent(head: string, name: string) {
  const regex = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    'i'
  );
  const match = head.match(regex);
  return decodeEntities(match?.[1] ?? null);
}

function extractCanonical(head: string) {
  const match = head.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i
  );
  return decodeEntities(match?.[1] ?? null);
}

function extractBodyAttributes(html: string) {
  const match = html.match(/<body([^>]*)>/i);
  if (!match?.[1]) return {};

  const attrs: Record<string, string> = {};
  const attrRegex =
    /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(match[1]))) {
    const [, rawKey, v1, v2, v3] = attrMatch;
    const key = rawKey.toLowerCase();
    const value = decodeEntities(v1 ?? v2 ?? v3 ?? '') ?? '';
    attrs[key] = value;
  }

  return attrs;
}

type LayoutSlices = {
  header: string;
  footer: string;
  content: string;
};

const extractFirstMatch = (
  html: string,
  regex: RegExp,
  placeholder: string
) => {
  const match = html.match(regex);
  if (!match) return { fragment: '', rest: html };
  const fragment = match[0];
  const rest = html.replace(
    fragment,
    `<!-- ${placeholder} replaced by Next component -->`
  );
  return { fragment, rest };
};

export function splitLayoutSections(body: string): LayoutSlices {
  let working = body;

  let { fragment: header, rest: noHeader } = extractFirstMatch(
    working,
    /<header[^>]*data-elementor-type=["']header["'][\s\S]*?<\/header>/i,
    'header'
  );

  if (!header) {
    const fallback = extractFirstMatch(
      working,
      /<header[\s\S]*?<\/header>/i,
      'header'
    );
    header = fallback.fragment;
    noHeader = fallback.rest;
  }

  working = header ? noHeader : working;

  let { fragment: footer, rest: noFooter } = extractFirstMatch(
    working,
    /<footer[^>]*data-elementor-type=["']footer["'][\s\S]*?<\/footer>/i,
    'footer'
  );

  if (!footer) {
    const fallback = extractFirstMatch(
      working,
      /<footer[\s\S]*?<\/footer>/i,
      'footer'
    );
    footer = fallback.fragment;
    noFooter = fallback.rest;
  }

  working = footer ? noFooter : working;

  return {
    header,
    footer,
    content: working,
  };
}

export const loadHtmlDocument = cache(async (slug: string[] = []) => {
  const candidates = buildCandidates(slug);

  for (const relativePath of candidates) {
    const fullPath = path.normalize(path.join(PUBLIC_DIR, relativePath));

    if (!fullPath.startsWith(PUBLIC_DIR)) continue;
    if (!(await fileExists(fullPath))) continue;

    const html = await fs.readFile(fullPath, 'utf8');
    const head = extractSection(html, 'head') ?? '';
    const body = extractSection(html, 'body') ?? html;

    return {
      head,
      body,
      title: extractTitle(head),
      description: extractMetaContent(head, 'description'),
      canonical: extractCanonical(head),
      bodyAttributes: extractBodyAttributes(html),
      filePath: fullPath,
    } satisfies LoadedHtml;
  }

  return null;
});
