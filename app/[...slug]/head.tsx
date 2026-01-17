import LegacyHead from '../components/LegacyHead';
import { loadHtmlDocument } from '../lib/html';

type HeadProps = {
  params: { slug?: string[] } | Promise<{ slug?: string[] }>;
};

export default async function Head({ params }: HeadProps) {
  const { slug = [] } = await params;

  const doc = await loadHtmlDocument(slug);
  if (!doc) return null;

  return <LegacyHead headHtml={doc.head} />;
}
