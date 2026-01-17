'use client';

import React, { useEffect, useState } from 'react';
import CommentForm from './comment-form';

type Comment = {
  id: number;
  content: string;
  created_at: string;
  parent_id?: number | null;
  author_name?: string | null;
};

export default function CommentList({
  comments,
  articleId,
  onAdded,
  loading,
  onOptimisticAdd,
  onReplace,
  onOptimisticRemove,
}: {
  comments: Comment[];
  articleId: string | number;
  onAdded?: () => void;
  loading?: boolean;
  onOptimisticAdd?: (t: any) => void;
  onReplace?: (tempId: number, real: any) => void;
  onOptimisticRemove?: (tempId: number) => void;
}) {
  const [openReplyFor, setOpenReplyFor] = useState<number | null>(null);

  if (loading)
    return <div className="text-sm text-gray-500">Loading comments…</div>;

  if (!comments || comments.length === 0)
    return (
      <div className="text-sm text-gray-500">
        No comments yet — be the first to comment.
      </div>
    );
  // group by parent_id
  const roots = comments.filter((c) => !c.parent_id);
  const childrenMap: Record<number, Comment[]> = {};
  for (const c of comments) {
    if (c.parent_id) {
      childrenMap[c.parent_id] = childrenMap[c.parent_id] || [];
      childrenMap[c.parent_id].push(c);
    }
  }

  return (
    <ul className="space-y-4">
      {roots.map((c) => (
        <li key={c.id} className="border rounded-md p-3">
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {c.content}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-400">
              {c.author_name || 'You'} •{' '}
              {new Date(c.created_at).toLocaleString()}
            </div>
            <button
              className="text-xs text-indigo-600"
              onClick={() =>
                setOpenReplyFor(openReplyFor === c.id ? null : c.id)
              }
            >
              Reply
            </button>
          </div>
          {openReplyFor === c.id && (
            <div className="mt-3">
              <CommentForm
                articleId={articleId}
                parentId={c.id}
                onCommentAdded={() => {
                  setOpenReplyFor(null);
                  if (onAdded) onAdded();
                }}
                onOptimisticAdd={onOptimisticAdd}
                onReplace={onReplace}
                onOptimisticRemove={onOptimisticRemove}
              />
            </div>
          )}

          {/* Render replies */}
          {childrenMap[c.id]?.map((r) => (
            <div
              key={r.id}
              className="mt-3 ml-6 border-l pl-3 text-sm text-gray-700"
            >
              <div className="whitespace-pre-wrap">{r.content}</div>
              <div className="text-xs text-gray-400 mt-2">
                {r.author_name || 'You'} •{' '}
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
