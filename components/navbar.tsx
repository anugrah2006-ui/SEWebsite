'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Menu,
  User,
  LogOut,
  Settings,
  PenTool,
  FilePlus2,
  Wrench,
} from 'lucide-react';

export default function Navbar() {
  const { data: session, status, update } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [signInBusy, setSignInBusy] = useState(false);
  useEffect(() => {
    const onAuthChanged = async (ev: Event) => {
      try {
        // If the event carries session data, use it directly to update
        const ce = ev as CustomEvent;
        if (ce?.detail) {
          try {
            await update(ce.detail);
          } catch {
            try {
              await update();
            } catch {}
          }
          return;
        }
        const res = await fetch('/api/auth/session');
        const s = res.ok ? await res.json() : undefined;
        await update(s);
      } catch {
        try {
          await update();
        } catch {}
      }
    };
    window.addEventListener('letsreact:auth-changed', onAuthChanged);
    return () =>
      window.removeEventListener('letsreact:auth-changed', onAuthChanged);
  }, [update]);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Calculator', href: '/calculator' },
    { name: 'Posts', href: '/posts' },
    { name: 'Reduce My Cost', href: '/contact' },
  ];
  const ctaName = 'Reduce My Cost';

  const role = (session?.user as any)?.role;
  const isAdmin = role === 'admin';
  const isAuthor = role === 'author';

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/assets/logo.webp"
                alt="LLM Cost Optimizer Logo"
                width={200}
                height={200}
                className="h-10 w-auto object-contain"
                sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 200px"
                priority
              />
              {/* <span className="text-xl font-bold text-gray-900">LetsReact</span> */}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => {
              const isCTA = item.name === ctaName;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-all ${isCTA ? 'inline-flex items-center gap-2 rounded-full bg-gray-900 text-white shadow-lg shadow-gray-900/20 ring-1 ring-gray-900/70 hover:-translate-y-0.5 hover:bg-gray-800 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Desktop Post button hidden per request */}
            {isAdmin && (
              <Link
                href="/admin/settings"
                className="hidden md:flex items-center p-2 text-gray-700 hover:text-gray-900 transition-colors"
                aria-label="Admin Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
            )}
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                    aria-label={`Open user menu${session.user?.name ? ` for ${session.user.name}` : ''}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={session.user?.image || ''}
                        alt={session.user?.name || ''}
                      />
                      <AvatarFallback>
                        {session.user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{session.user?.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center">
                        <PenTool className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin/redirects"
                        className="flex items-center"
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        Redirects
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin/not-found-urls"
                        className="flex items-center"
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        Not Found URLs
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {(isAuthor || isAdmin) && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={isAdmin ? '/admin/articles/new' : '/write'}
                        className="flex items-center"
                      >
                        <FilePlus2 className="mr-2 h-4 w-4" />
                        New Article
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // When session is still loading, show a disabled placeholder to avoid a click race
              <Button
                onClick={async () => {
                  if (status === 'loading' || signInBusy) return;
                  setSignInBusy(true);
                  try {
                    // Open provider signin inside a popup so the main page is not redirected
                    const callback =
                      typeof window !== 'undefined'
                        ? window.location.href
                        : '/';
                    const url = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callback)}`;
                    const width = 600;
                    const height = 700;
                    const left = Math.max(0, (window.screen.width - width) / 2);
                    const top = Math.max(
                      0,
                      (window.screen.height - height) / 2
                    );
                    let popup: Window | null = null;
                    try {
                      popup = window.open(
                        url,
                        'SignIn',
                        `width=${width},height=${height},left=${left},top=${top}`
                      );
                    } catch {
                      popup = null;
                    }
                    if (!popup) {
                      try {
                        popup = window.open(url, '_blank');
                      } catch {
                        popup = null;
                      }
                    }
                    if (!popup) {
                      try {
                        alert('Please enable popups to sign in.');
                      } catch {}
                      return;
                    }

                    // Poll session
                    const signed = await new Promise<boolean>((resolve) => {
                      const iv = setInterval(async () => {
                        try {
                          if (popup!.closed) {
                            clearInterval(iv);
                            try {
                              const sres = await fetch('/api/auth/session');
                              if (sres.ok) {
                                const s = await sres.json();
                                resolve(!!s?.user);
                                return;
                              }
                            } catch {}
                            resolve(false);
                            return;
                          }
                          const sres = await fetch('/api/auth/session');
                          if (sres.ok) {
                            const s = await sres.json();
                            if (s?.user) {
                              try {
                                popup!.close();
                              } catch {}
                              clearInterval(iv);
                              resolve(true);
                              return;
                            }
                          }
                        } catch {}
                      }, 1000);
                    });

                    if (signed) {
                      // let other UI refresh as well
                      try {
                        window.dispatchEvent(
                          new Event('letsreact:auth-changed')
                        );
                      } catch {}
                      try {
                        await update();
                      } catch {}
                    }
                  } finally {
                    setSignInBusy(false);
                  }
                }}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white hover:text-white"
                variant="outline"
                disabled={status === 'loading' || signInBusy}
              >
                <span className="bg-white rounded-full p-0.5 flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 48 48"
                    className="h-5 w-5"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g>
                      <path
                        fill="#4285F4"
                        d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.3-5.7 7-10.3 7-6.1 0-11-4.9-11-11s4.9-11 11-11c2.6 0 5 .9 6.9 2.4l6.1-6.1C34.5 6.5 29.6 4.5 24 4.5 13.5 4.5 5 13 5 23.5S13.5 42.5 24 42.5c9.5 0 17.5-7.7 17.5-17.5 0-1.2-.1-2.1-.3-3z"
                      />
                      <path
                        fill="#34A853"
                        d="M6.3 14.1l6.6 4.8C14.5 16.1 18.9 13 24 13c2.6 0 5 .9 6.9 2.4l6.1-6.1C34.5 6.5 29.6 4.5 24 4.5c-7.1 0-13.1 4.1-16.1 10.1z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M24 42.5c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.3c-2 1.4-4.5 2.2-7.6 2.2-4.6 0-8.7-2.7-10.3-7H6.3c3 6 9 10 17.7 10z"
                      />
                      <path
                        fill="#EA4335"
                        d="M43.6 20.5h-1.9V20H24v8h11.3c-0.7 2-2.1 3.7-4.1 4.9l6.5 5.3c-0.6 0.6 6.3-4.6 6.3-13.2 0-1.2-.1-2.1-.3-3z"
                      />
                    </g>
                  </svg>
                </span>
                <span className="block sm:hidden">Sign In</span>
                <span className="hidden sm:inline">Sign in with Google</span>
              </Button>
            )}

            {/* Mobile menu button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label={isOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={isOpen}
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4 mt-4">
                  {navigation.map((item) => {
                    const isCTA = item.name === ctaName;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`text-lg font-medium transition-all ${isCTA ? 'inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-white shadow-lg shadow-gray-900/20 ring-1 ring-gray-900/70 hover:-translate-y-0.5 hover:bg-gray-800 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                  {/* Mobile Post button hidden per request */}
                  {isAdmin && (
                    <Link
                      href="/admin/settings"
                      className="text-lg font-medium text-gray-700 hover:text-gray-900 transition-all flex items-center gap-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      Admin Settings
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
