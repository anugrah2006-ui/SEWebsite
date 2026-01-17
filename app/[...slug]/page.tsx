import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BodyAttributes from '../components/BodyAttributes';
import HtmlBlock from '../components/HtmlBlock';
import LegacyContent from '../components/LegacyContent';
import { loadHtmlDocument, splitLayoutSections } from '../lib/html';

type PageProps = {
  params: { slug?: string[] } | Promise<{ slug?: string[] }>;
};

const normalizeSlug = (slug: string[]) => {
  const clean = [...slug].filter(Boolean);
  const last = clean.at(-1)?.toLowerCase();
  if (last === 'index' || last === 'index.html') clean.pop();
  return clean;
};

const buildCanonical = (docCanonical: string | null, slug: string[]) => {
  const cleanSlug = normalizeSlug(slug);
  const basePath = cleanSlug.length ? `/${cleanSlug.join('/')}` : '/';

  if (!docCanonical) return basePath;

  if (/^https?:\/\//i.test(docCanonical)) return docCanonical;
  if (docCanonical.startsWith('/')) return docCanonical;

  const trimmed = docCanonical.replace(/^\.?\//, '');
  if (trimmed === 'index.html') return basePath;

  return `${basePath}/${trimmed}`.replace(/\/+/g, '/');
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug = [] } = await params;

  const doc = await loadHtmlDocument(slug);
  if (!doc) return {};

  const canonical = buildCanonical(doc.canonical, slug);

  return {
    title: doc.title ?? undefined,
    description: doc.description ?? undefined,
    alternates: { canonical },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug = [] } = await params;

  const doc = await loadHtmlDocument(slug);
  if (!doc) return notFound();

  const layout = splitLayoutSections(doc.body);

  return (
    <>
      <BodyAttributes attributes={doc.bodyAttributes} />
      <HtmlBlock id="legacy-header" html={layout.header} />
      <LegacyContent html={layout.content} />
      <HtmlBlock id="legacy-footer" html={layout.footer} />
    </>
  );
}
