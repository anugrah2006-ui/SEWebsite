import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.toLowerCase();

  // Allow internal assets, APIs, and direct file requests to pass through.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/site.webmanifest' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Keep REST-style assets under /wp-json working (there are extensionless files there).
  if (pathname.startsWith('/wp-json')) {
    if (pathname === '/wp-json' || pathname === '/wp-json/') {
      const url = request.nextUrl.clone();
      url.pathname = '/wp-json/index.html';
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // Redirect legacy sponsorship URL to contact page.
  if (pathname === '/sponsorship' || pathname === '/sponsorship-request') {
    const url = request.nextUrl.clone();
    url.pathname = '/contact/index.html';
    return NextResponse.redirect(url);
  }

  const url = request.nextUrl.clone();

  if (pathname === '/' || pathname === '') {
    url.pathname = '/index.html';
  } else if (pathname.endsWith('/')) {
    url.pathname = `${pathname}index.html`;
  } else {
    url.pathname = `${pathname}/index.html`;
  }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/:path*',
};
