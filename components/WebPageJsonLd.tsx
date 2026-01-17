'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { JSONLD } from '@/components/SEO';

type Props = {
  baseUrl: string;
  siteName: string;
  orgId: string;
};

/**
 * Renders a WebPage JSON-LD node for the current path to aid search and generative engines.
 */
export default function WebPageJsonLd({
  baseUrl,
  siteName,
  orgId,
}: Props): JSX.Element | null {
  const pathname = usePathname();

  const data = useMemo(() => {
    if (!pathname) return null;
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const url = `${cleanBase}${pathname}`;
    const isoNow = new Date().toISOString();

    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: siteName,
      dateModified: isoNow,
      datePublished: isoNow,
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${cleanBase}#website`,
      },
      about: { '@id': orgId },
    };
  }, [baseUrl, orgId, pathname, siteName]);

  if (!data) return null;
  return <JSONLD data={data} />;
}
