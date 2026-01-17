'use client';

import React, { useEffect, useState, useRef } from 'react';
import CommentForm from './comment-form';
import CommentList from './comment-list';

type Comment = {
  id: number;
  content: string;
  created_at: string;
  parent_id?: number | null;
  author_name?: string | null;
};

export default function CommentsSection({
  articleId,
}: {
  articleId: string | number;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const lastSeenRef = useRef<string | null>(null);
  const articleIdRef = useRef<string | number>(articleId);

  // keep refs in sync when state/props change
  useEffect(() => {
    lastSeenRef.current = lastSeen;
  }, [lastSeen]);
  useEffect(() => {
    articleIdRef.current = articleId;
  }, [articleId]);

  // dedupe/fetch cache at module scope (per app process)
  // Avoids hammering the same endpoint if multiple components mount or polling overlaps
  const fetchKey = (url: string) => url;
  const inFlightMap = ((global as any).__lr_comments_inflight ||= new Map<
    string,
    Promise<any>
  >());

  async function load() {
    setLoading(true);
    try {
      const url = `/api/comments/${encodeURIComponent(String(articleId))}`;
      const key = fetchKey(url);
      let p = inFlightMap.get(key);
      if (!p) {
        p = fetch(url)
          .then(async (res) => {
            if (!res.ok) throw new Error('Failed to load comments');
            return res.json();
          })
          .finally(() => {
            inFlightMap.delete(key);
          });
        inFlightMap.set(key, p);
      }
      const data = await p;
      setComments(data.comments || []);
      if (Array.isArray(data.comments) && data.comments.length > 0) {
        const last = data.comments[data.comments.length - 1];
        if (last?.created_at) {
          setLastSeen(last.created_at);
          lastSeenRef.current = last.created_at;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  // Poll for new comments every 5s and append them without full replace
  useEffect(() => {
    // Poll for new comments periodically.
    // Use refs for lastSeen/articleId so the interval doesn't get recreated on each lastSeen update
    let stopped = false;
    let polling = false;
    const iv = setInterval(async () => {
      if (stopped || polling) return;
      // don't poll when page is hidden to avoid background hammering
      if (typeof document !== 'undefined' && document.hidden) return;
      polling = true;
      try {
        const sinceParam = lastSeenRef.current
          ? `?since=${encodeURIComponent(lastSeenRef.current)}`
          : '';
        const url = `/api/comments/${encodeURIComponent(String(articleIdRef.current))}${sinceParam}`;
        const key = fetchKey(url);
        let p = inFlightMap.get(key);
        if (!p) {
          p = fetch(url)
            .then(async (res) => {
              if (!res.ok) throw new Error('Failed to poll comments');
              return res.json();
            })
            .finally(() => {
              inFlightMap.delete(key);
            });
          inFlightMap.set(key, p);
        }
        const data = await p;
        const newComments = data.comments || [];
        if (newComments.length > 0) {
          setComments((current) => {
            const existingIds = new Set(current.map((x) => x.id));
            const filtered = newComments.filter(
              (n: any) => !existingIds.has(n.id)
            );
            if (filtered.length === 0) return current;
            const next = [...current, ...filtered];
            const newest = filtered[filtered.length - 1];
            if (newest?.created_at) {
              setLastSeen(newest.created_at);
              lastSeenRef.current = newest.created_at;
            }
            return next;
          });
        }
      } catch (e) {
        // ignore polling errors silently
      } finally {
        polling = false;
      }
    }, 10000);
    return () => {
      stopped = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const addCommentOptimistic = React.useCallback((temp: Comment) => {
    setComments((c) => {
      const next = [...c, temp];
      if (temp.created_at) setLastSeen(temp.created_at);
      return next;
    });
  }, []);

  const replaceTempWithReal = React.useCallback(
    (tempId: number, real: Comment) => {
      setComments((c) => {
        const exists = c.some((x) => x.id === real.id);
        if (exists) {
          // remove temp if present
          return c.filter((x) => x.id !== tempId);
        }
        // replace temp with real
        return c.map((x) => (x.id === tempId ? real : x));
      });
      if (real?.created_at) setLastSeen(real.created_at);
    },
    []
  );

  const removeOptimistic = React.useCallback((tempId: number) => {
    setComments((c) => c.filter((x) => x.id !== tempId));
  }, []);

  return (
    <div>
      <CommentForm
        articleId={articleId}
        onOptimisticAdd={addCommentOptimistic}
        onReplace={replaceTempWithReal}
        onOptimisticRemove={removeOptimistic}
      />
      <CommentList
        comments={comments}
        articleId={articleId}
        loading={loading}
        onOptimisticAdd={addCommentOptimistic}
        onReplace={replaceTempWithReal}
        onOptimisticRemove={removeOptimistic}
      />
    </div>
  );
}
