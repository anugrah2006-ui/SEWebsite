'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function ArticleListItem({ article }: { article: any }) {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated';

  return (
    <Link
      href={`/${article.slug}`}
      className="block"
      style={{ textDecoration: 'none' }}
    >
      <div className="group flex items-start gap-3 p-4 rounded-lg border border-gray-100 bg-white hover:shadow-md transition-shadow">
        {/* Main content (no thumbnail in list view) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold leading-tight text-gray-900 truncate">
              {article.title}
            </h3>
            <div className="ml-2 text-sm text-gray-400 transition-transform group-hover:translate-x-1">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>

          {/* tags intentionally omitted in list view */}

          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
            {article.excerpt}
          </p>

          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            <span>
              {article.created_at
                ? new Date(article.created_at).toLocaleDateString()
                : ''}
            </span>
            {isAuthed && typeof article.views_count !== 'undefined' ? (
              <>
                <span>•</span>
                <span>{article.views_count} views</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
