'use client';

import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface OneLineTagsProps {
  tags: string[];
  maxTags?: number; // optional hard ceiling to avoid excessive DOM nodes for huge tag lists
  className?: string;
}

/**
 * Displays only the tags that fit on a single visual line. Remaining tags are ignored.
 * Strategy: render all (up to maxTags), measure which children share the first row via offsetTop, then re-render only those.
 * Re-measures on resize.
 */
export function OneLineTags({
  tags,
  maxTags = 25,
  className = '',
}: OneLineTagsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const limitedTags = tags.slice(0, maxTags);

  useLayoutEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;
      const firstTop = children[0].offsetTop;
      let count = 0;
      for (const child of children) {
        if (child.offsetTop === firstTop) count++;
        else break;
      }
      setVisibleCount(count);
    }

    // Defer measurement to ensure DOM layout is ready
    requestAnimationFrame(measure);

    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [limitedTags.map((t) => t).join('|')]);

  // In case of font loading shifts, re-measure shortly after mount
  useEffect(() => {
    const t = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;
      const firstTop = children[0].offsetTop;
      let count = 0;
      for (const child of children) {
        if (child.offsetTop === firstTop) count++;
        else break;
      }
      setVisibleCount((prev) => (prev !== count ? count : prev));
    }, 150);
    return () => clearTimeout(t);
  }, []);

  // While measuring, render all (wrapped) but visually hidden to measure which fit on the first row.
  if (visibleCount == null) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center gap-2 flex-wrap ${className} opacity-0 pointer-events-none`}
      >
        {limitedTags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-xs whitespace-nowrap"
          >
            {tag}
          </Badge>
        ))}
      </div>
    );
  }

  // After measuring, render a single-line, no-wrap row showing only the tags that fit.
  const total = limitedTags.length;
  const visibleTags = limitedTags.slice(0, Math.min(visibleCount, total));

  return (
    <div
      className={`flex items-center gap-2 overflow-hidden whitespace-nowrap ${className}`}
    >
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-xs whitespace-nowrap flex-shrink-0"
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}

export default OneLineTags;
