import type { Metadata } from 'next';
import { site } from '@/lib/seo';

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
};

/**
 * Build consistent Metadata objects for static pages with canonical, OG, and Twitter fields.
 */
export function buildPageMetadata(options: PageMetadataOptions): Metadata {
  const {
    title,
    description,
    path,
    image = '/og.webp',
    type = 'website',
  } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = site.url.replace(/\/+$/, '');
  const url = `${base}${normalizedPath}`;

  return {
    title,
    description,
    alternates: { canonical: normalizedPath },
    openGraph: {
      title,
      description,
      url,
      images: [image],
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
