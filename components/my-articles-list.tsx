'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import LocalDate from '@/components/local-date';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Row = {
  id: number;
  title: string;
  slug: string;
  published: boolean | 0 | 1 | null;
  created_at: string;
  views_count?: number | null;
};

export default function MyArticlesList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<
    'all' | 'published' | 'scheduled' | 'draft' | 'popular'
  >('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        params.set('status', status);
        if (q.trim()) params.set('q', q.trim());
        const res = await fetch(`/api/me/articles?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!cancelled) {
          setRows(Array.isArray(data.articles) ? data.articles : []);
          setTotal(Number(data.total || 0));
        }
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, limit, status, q]);

  // Reset page to 1 when filters change (except page itself)
  useEffect(() => {
    setPage(1);
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="inline-flex rounded-md border bg-white p-1 w-fit">
          {(['all', 'published', 'scheduled', 'draft', 'popular'] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1 text-sm rounded ${status === s ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {s === 'popular'
                  ? 'Most Popular'
                  : s === 'scheduled'
                    ? 'Scheduled'
                    : s[0].toUpperCase() + s.slice(1)}
              </button>
            )
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search title or URL slug"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-72"
          />
          <Button variant="outline" onClick={() => setQ('')}>
            Clear
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden bg-white">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 border-b">
          <div className="col-span-6">Title</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-2 text-right">Views</div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No articles found.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const isPub = r.published === true || r.published === 1;
              const isScheduled =
                isPub && r.created_at && new Date(r.created_at) > new Date();
              return (
                <li
                  key={r.id}
                  className="px-4 py-3 grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-6 min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-gray-500 truncate">
                      /{r.slug}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <a
                        href={`/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' })
                        )}
                      >
                        View
                      </a>
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/admin/articles/${r.id}/edit`}>Edit</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${isScheduled ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : isPub ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                    >
                      {isScheduled
                        ? 'Scheduled'
                        : isPub
                          ? 'Published'
                          : 'Draft'}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-gray-700">
                    <LocalDate iso={r.created_at} />
                  </div>
                  <div className="col-span-2 text-right text-sm tabular-nums">
                    {(r.views_count ?? 0).toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Page {page} of {totalPages} • {total.toLocaleString()} total
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
