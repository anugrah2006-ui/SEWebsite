'use client';

import { useEffect, useRef } from 'react';

type Props = {
  html: string;
};

// Ensure any HTML tags inside <code>/<pre> render as literal text (do not break the code block)
function preserveHtmlInsideCode(raw: string): string {
  try {
    // Only runs on client; safe to use document
    const container = document.createElement('div');
    container.innerHTML = raw;

    // Helper: return the <code> element to normalize processing, even if we start at <pre>
    const getCodeEl = (el: Element): HTMLElement => {
      if (el.tagName === 'PRE') {
        const found = el.querySelector('code') as HTMLElement | null;
        return found || (el as HTMLElement);
      }
      return el as HTMLElement;
    };

    // We consider only span/br as valid children when syntax highlighting is applied
    const isAllowedChild = (tag: string) => tag === 'SPAN' || tag === 'BR';

    const candidates = container.querySelectorAll('pre, code');
    candidates.forEach((el) => {
      const codeEl = getCodeEl(el);

      // Normalize inner HTML by removing accidental literal <code> wrappers
      // whether they're raw or HTML-escaped, and trim surrounding whitespace.
      try {
        let inner = codeEl.innerHTML || '';
        inner = inner.replace(/^\s*(?:&lt;code&gt;|<code>)\s*/i, '');
        inner = inner.replace(/\s*(?:&lt;\/code&gt;|<\/code>)\s*$/i, '');

        // Remove any pure text nodes that equal '<code>' or '&lt;code&gt;'
        Array.from(codeEl.childNodes).forEach((ch) => {
          if (ch.nodeType === Node.TEXT_NODE) {
            const t = (ch.textContent || '').trim();
            if (
              /^(&lt;code&gt;|<code>)$/i.test(t) ||
              /^(&lt;\/code&gt;|<\/code>)$/i.test(t)
            )
              ch.parentNode?.removeChild(ch);
          }
        });

        // Write back normalized inner (do not unescape here; we'll only convert to
        // textContent if the block contains disallowed elements).
        codeEl.innerHTML = inner;

        const hasDisallowed = Array.from(codeEl.querySelectorAll('*')).some(
          (ch) => !isAllowedChild(ch.tagName)
        );
        if (hasDisallowed) {
          // Convert to text so any parsed tags become literal text inside code block
          codeEl.textContent = inner;
        }
      } catch {}
    });

    return container.innerHTML;
  } catch {
    // If anything fails, fall back to raw
    return raw;
  }
}

export default function MathHtml({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const mod: any = await import('katex/contrib/auto-render');
        const renderMathInElement = mod.default || mod;
        if (!cancelled && ref.current) {
          // First, normalize code/pre blocks so any nested HTML tags remain literal text
          try {
            const root = ref.current;
            const isAllowed = (tag: string) => tag === 'SPAN' || tag === 'BR';
            root.querySelectorAll('pre, code').forEach((el) => {
              const codeEl =
                el.tagName === 'PRE' ? el.querySelector('code') || el : el;
              const hasDisallowed = Array.from(
                codeEl.querySelectorAll('*')
              ).some((ch) => !isAllowed(ch.tagName));
              if (hasDisallowed) {
                (codeEl as HTMLElement).textContent = (
                  codeEl as HTMLElement
                ).innerHTML;
              }
            });
          } catch {}
          // If content already contains KaTeX output, skip re-processing
          if (ref.current.querySelector('.katex')) return;
          renderMathInElement(ref.current, {
            // Common TeX delimiters
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\(', right: '\\)', display: false },
              { left: '\\[', right: '\\]', display: true },
            ],
            throwOnError: false,
            strict: false,
            ignoredTags: ['script', 'style', 'textarea', 'pre', 'code'],
            ignoredClasses: ['no-math', 'not-math'],
          });
        }
      } catch (e) {
        // noop: if auto-render isn't available, just show the raw HTML
        console.warn('KaTeX auto-render failed', e);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [html]);

  // Pre-process the HTML to ensure any tags inside <pre>/<code> are escaped
  // before assigning to innerHTML. This prevents the browser from parsing
  // and moving elements like <p> out of the code block.
  const processed =
    typeof document !== 'undefined' ? preserveHtmlInsideCode(html) : html;
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: processed }} />;
}
