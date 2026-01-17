'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogIn } from 'lucide-react';

/**
 * SignInPrompt
 * - Client component that opens a modal when user scrolls past 50% of the page height.
 * - Only triggers for unauthenticated users, and only once per article view.
 * - Dismiss persists for the current path using sessionStorage.
 */
export default function SignInPrompt({ articleSlug }: { articleSlug: string }) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    const key = `signin-prompt-dismissed:${articleSlug}`;
    const dismissed = () => !!sessionStorage.getItem(key);

    const onScroll = () => {
      if (triggeredRef.current) return;
      if (dismissed()) return;
      // Only prompt unauthenticated users; if status is still loading, wait for next scroll
      if (status !== 'unauthenticated') return;
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const docHeight = Math.max(
        doc.scrollHeight,
        doc.offsetHeight,
        document.body.scrollHeight,
        document.body.offsetHeight
      );
      const viewport = window.innerHeight;
      // Show once the user has scrolled at least half a viewport ("half of the fold")
      // Fallback: if page is very long, also allow at ~50% of total page height
      const halfFoldReached = scrollTop >= viewport * 0.5;
      const halfPageReached = (scrollTop + viewport) / docHeight >= 0.5;
      if (scrollTop > 0 && (halfFoldReached || halfPageReached)) {
        triggeredRef.current = true;
        setOpen(true);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [status, articleSlug]);

  const dismiss = () => {
    const key = `signin-prompt-dismissed:${articleSlug}`;
    sessionStorage.setItem(key, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enjoying the article?</DialogTitle>
          <DialogDescription>
            Sign in to bookmark posts, track reading, and get personalized
            content.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 text-sm text-muted-foreground">
          It's free and takes less than a minute with Google.
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={dismiss}>
            Maybe later
          </Button>
          <Button
            onClick={() =>
              signIn(undefined, { callbackUrl: `/${articleSlug}` })
            }
          >
            <LogIn className="h-4 w-4 mr-2" /> Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
