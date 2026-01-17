'use client';

import React, { useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  articleId: string | number;
  parentId?: number | null;
  onCommentAdded?: () => void;
  onOptimisticAdd?: (temp: any) => void;
  onReplace?: (tempId: number, real: any) => void;
  onOptimisticRemove?: (tempId: number) => void;
};

export default function CommentForm({
  articleId,
  parentId,
  onCommentAdded,
  onOptimisticAdd,
  onReplace,
  onOptimisticRemove,
}: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const loginResolveRef = useRef<((v: boolean) => void) | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const EMOJIS = [
    '😀',
    '😄',
    '😊',
    '🔥',
    '🎉',
    '👍',
    '❤️',
    '🚀',
    '😅',
    '🤔',
    '👏',
    '🙌',
  ];

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((c) => c + emoji);
      return;
    }
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const newText = content.slice(0, start) + emoji + content.slice(end);
    setContent(newText);
    // restore cursor after emoji
    requestAnimationFrame(() => {
      try {
        ta.focus();
        const pos = start + emoji.length;
        ta.selectionStart = ta.selectionEnd = pos;
      } catch {}
    });
    setShowEmojiPicker(false);
  }

  function askSignInConfirmation() {
    setLoginPromptOpen(true);
    return new Promise<boolean>((resolve) => {
      loginResolveRef.current = resolve;
    });
  }

  async function popupSignInGoogle(): Promise<boolean> {
    try {
      const url = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(window.location.href)}`;
      const width = 600;
      const height = 700;
      const left = Math.max(0, (window.screen.width - width) / 2);
      const top = Math.max(0, (window.screen.height - height) / 2);
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
        return false;
      }

      return await new Promise<boolean>((resolve) => {
        const iv = setInterval(async () => {
          try {
            if (popup?.closed) {
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
                  popup?.close();
                } catch {}
                clearInterval(iv);
                resolve(true);
                return;
              }
            }
          } catch {}
        }, 1000);
      });
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim()) return setError('Comment cannot be empty');
    if (content.length > 2000)
      return setError('Comment is too long (max 2000 chars)');

    const tempId = Date.now() * -1;
    const temp = {
      id: tempId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      parent_id: parentId || null,
      author_name: 'You',
    };
    if (onOptimisticAdd) onOptimisticAdd(temp);
    setLoading(true);
    try {
      const payload: any = { content: content.trim() };
      if (parentId) payload.parent_id = parentId;
      const doPost = async () =>
        fetch(`/api/comments/${encodeURIComponent(String(articleId))}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      let res = await doPost();
      if (res.status === 401) {
        const signed = await askSignInConfirmation();
        if (!signed) {
          if (onOptimisticRemove) onOptimisticRemove(tempId);
          return;
        }
        try {
          // Fetch the current session and dispatch it to help other UI update immediately
          try {
            const sres = await fetch('/api/auth/session');
            const s = sres.ok ? await sres.json() : undefined;
            window.dispatchEvent(
              new CustomEvent('letsreact:auth-changed', { detail: s })
            );
          } catch {
            // Fallback to simple signal
            window.dispatchEvent(new Event('letsreact:auth-changed'));
          }
        } catch {}
        res = await doPost();
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to post comment');
      }
      const body = await res.json().catch(() => ({}));
      if (onReplace && body?.id) {
        const real = {
          id: body.id,
          content: content.trim(),
          created_at: new Date().toISOString(),
          parent_id: parentId || null,
          author_name: (body?.author_name as string) || null,
        };
        onReplace(tempId, real);
      }
      setContent('');
      if (onCommentAdded) onCommentAdded();
    } catch (err: any) {
      setError(err?.message || String(err));
      if (onOptimisticRemove) onOptimisticRemove(tempId);
      try {
        toast({
          title: 'Failed to post comment',
          description: err?.message || 'Could not post comment',
          variant: 'destructive',
        });
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-start gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-100 shadow-sm">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium">
              Y
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-900">You</div>
                <div className="text-xs text-gray-400">Commenting</div>
              </div>
              <div className="text-xs text-gray-400">{content.length}/2000</div>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="mt-2 w-full min-h-[96px] resize-none rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm leading-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="Share your thoughts... Be kind and constructive."
              disabled={loading}
              aria-invalid={!!error}
            />

            {error && (
              <div className="text-sm text-red-600 mt-2" role="alert">
                {error}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {/* <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100">Markdown supported</span> */}
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((s) => !s)}
                    className="ml-2 inline-flex items-center px-2 py-1 border rounded text-sm bg-white"
                  >
                    😀
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute z-50 mt-1 w-44 rounded-md bg-white shadow-md border p-2 grid grid-cols-6 gap-1">
                      {EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => insertEmoji(em)}
                          className="p-1 text-lg hover:bg-gray-100 rounded"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <Dialog
        open={loginPromptOpen}
        onOpenChange={(open: boolean) => {
          setLoginPromptOpen(open);
          if (!open && loginResolveRef.current) {
            loginResolveRef.current(false);
            loginResolveRef.current = null;
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to post your comment</DialogTitle>
            <DialogDescription>
              You need to sign in with Google to post comments. This will open a
              popup window and keep you on this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={loginBusy}
              onClick={() => {
                if (loginResolveRef.current) loginResolveRef.current(false);
                loginResolveRef.current = null;
                setLoginPromptOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={loginBusy}
              onClick={async () => {
                if (!loginResolveRef.current) {
                  setLoginPromptOpen(false);
                  return;
                }
                try {
                  setLoginBusy(true);
                  const success = await popupSignInGoogle();
                  loginResolveRef.current(!!success);
                } finally {
                  loginResolveRef.current = null;
                  setLoginBusy(false);
                  setLoginPromptOpen(false);
                }
              }}
            >
              {loginBusy ? 'Opening…' : 'Continue with Google'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
