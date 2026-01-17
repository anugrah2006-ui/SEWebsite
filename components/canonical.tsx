'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { site } from '@/lib/seo';

function normalizePath(pathname: string) {
  if (!pathname) return '/';
  if (pathname !== '/' && pathname.endsWith('/'))
    return pathname.replace(/\/+$/, '');
  return pathname;
}

export default function CanonicalLink() {
  const pathname = usePathname();
  useEffect(() => {
    const base = (site.url || '').replace(/\/$/, '');
    if (!base) return;
    const href = `${base}${normalizePath(pathname || '/')}`;

    const head = document.head;
    let link = head.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }, [pathname]);

  return null;
}
