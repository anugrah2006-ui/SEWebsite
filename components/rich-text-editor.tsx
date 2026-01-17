'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EditorContent,
  useEditor,
} from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Code2,
  Braces,
  Underline as UnderlineIcon,
  Highlighter,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  Rows2,
  Rows3,
  Columns2,
  Columns3,
  Trash2,
  Smile,
} from 'lucide-react';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import HardBreak from '@tiptap/extension-hard-break';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import DOMPurify from 'dompurify';
// Using custom minimal buttons to avoid layout/icon issues within toolbar
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const lowlight = createLowlight();
lowlight.register('js', javascript as any);
lowlight.register('javascript', javascript as any);
lowlight.register('ts', typescript as any);
lowlight.register('typescript', typescript as any);
lowlight.register('xml', xml as any);
lowlight.register('html', xml as any);
lowlight.register('css', css as any);
lowlight.register('bash', bash as any);
lowlight.register('sh', bash as any);
lowlight.register('json', json as any);

export interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  minHeight?: number;
  toolbarOffset?: number; // distance from top when fixed
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  className,
  placeholder = 'Write something amazing...',
  minHeight = 300,
  toolbarOffset = 0,
}) => {
  const { toast } = useToast();
  const lastInitRef = useRef<string | null>(null);
  const lastImagePos = useRef<number | null>(null);
  const debounceTimer = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [sourceValue, setSourceValue] = useState(value || '');
  const sourceAreaRef = useRef<HTMLTextAreaElement | null>(null);
  // Track source edit state so toggling back without edits does not alter content
  const [sourceDirty, setSourceDirty] = useState(false);
  const [sourceSnapshot, setSourceSnapshot] = useState(''); // raw HTML when entering source mode
  const [sourceBaseline, setSourceBaseline] = useState(''); // pretty HTML shown initially

  // Auto-resize the source textarea to fit content height
  const adjustSourceHeight = useCallback(() => {
    const el = sourceAreaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const min = Math.max(0, Number(minHeight) || 0);
    el.style.height = Math.max(min, el.scrollHeight) + 'px';
  }, [minHeight]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [fixedToolbar, setFixedToolbar] = useState(false);
  const [toolbarStyle, setToolbarStyle] = useState<{
    width: number;
    left: number;
  }>({ width: 0, left: 0 });
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState('0 min');
  const [lastAutoSave, setLastAutoSave] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [altDraft, setAltDraft] = useState('');
  // Link editing state
  const [linkHref, setLinkHref] = useState('');
  const [linkBlank, setLinkBlank] = useState(false);
  const [relNoFollow, setRelNoFollow] = useState(false);
  const [relNoOpener, setRelNoOpener] = useState(false);
  const [relNoReferrer, setRelNoReferrer] = useState(false);
  // mention functionality removed
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement | null>(null);
  const autosaveKey = 'rte-autosave';

  // mention functionality removed – no authors fetch
  // Helper to strip <p> wrappers inside list items
  const stripListParagraphs = (html: string) => {
    // Fast regex replacements (non-greedy) plus DOM-safe fallback already in sanitize
    return html
      .replace(/<li>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/gi, '<li>$1</li>')
      .replace(/<li([^>]*)>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/gi, '<li$1>$2</li>');
  };

  const sanitize = useCallback((html: string) => {
    // Normalize disallowed heading levels: convert any H1 to H2
    const normalized = html
      .replace(/<h1(\b[^>]*)>/gi, '<h2$1>')
      .replace(/<\/h1>/gi, '</h2>');
    // Escape any raw angle-bracket markup inside <pre> or <code> so pasted JSX/HTML
    // inside code blocks remains as literal text and isn't parsed into DOM nodes
    // which can later be unwrapped or reflowed into <p> tags.
    const escapeCodeInner = (htmlStr: string) => {
      return htmlStr
        .replace(
          /(<pre\b[^>]*>)([\s\S]*?)(<\/pre>)/gi,
          (_m, open, inner, close) =>
            open + inner.replace(/</g, '&lt;').replace(/>/g, '&gt;') + close
        )
        .replace(
          /(<code\b[^>]*>)([\s\S]*?)(<\/code>)/gi,
          (_m, open, inner, close) =>
            open + inner.replace(/</g, '&lt;').replace(/>/g, '&gt;') + close
        );
    };

    const preEscaped = escapeCodeInner(normalized);

    const cleaned = DOMPurify.sanitize(preEscaped, {
      // Start from the html profile but explicitly allow form controls
      USE_PROFILES: { html: true },
      // Allow attributes used by images, links, tables and form controls
      ALLOWED_ATTR: [
        'href',
        'target',
        'rel',
        'src',
        'alt',
        'class',
        'colspan',
        'rowspan',
        'style',
        'data-align',
        // form-related
        'name',
        'type',
        'value',
        'checked',
        'selected',
        'placeholder',
        'for',
        'id',
      ],
      // Ensure form and control tags are preserved instead of removed by the sanitizer
      ALLOWED_TAGS: [
        'a',
        'abbr',
        'b',
        'blockquote',
        'br',
        'code',
        'div',
        'em',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'hr',
        'i',
        'img',
        'label',
        'li',
        'ol',
        'p',
        'pre',
        's',
        'small',
        'span',
        'strong',
        'sub',
        'sup',
        'u',
        'ul',
        'table',
        'thead',
        'tbody',
        'tfoot',
        'tr',
        'td',
        'th',
        'colgroup',
        'col',
        // form elements
        'form',
        'input',
        'textarea',
        'select',
        'option',
        'button',
      ],
    });
    try {
      if (typeof window === 'undefined') return cleaned;
      const doc = new DOMParser().parseFromString(cleaned, 'text/html');
      // Clean up code/pre blocks: remove accidental literal <code> wrappers
      // inside code blocks (these show up as visible "<code>..." lines).
      doc.querySelectorAll('pre, code').forEach((el) => {
        try {
          const txt = el.textContent || '';
          const cleanedTxt = txt
            .replace(/^\s*(?:<code>|&lt;code&gt;)+\s*/i, '')
            .replace(/\s*(?:<\/code>|&lt;\/code&gt;)+\s*$/i, '');
          if (cleanedTxt !== txt) el.textContent = cleanedTxt;
        } catch {}
      });

      // Remove stray literal <code> markers that ended up as text nodes
      // outside of actual <pre>/<code> blocks (common when copying examples
      // that include `<code>` wrappers). Only operate on text nodes that
      // are not inside code/pre elements.
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      let tn: Node | null = walker.nextNode();
      while (tn) {
        try {
          const parent = (tn.parentElement ||
            (tn.parentNode && (tn.parentNode as Element))) as Element | null;
          if (parent && !parent.closest('pre') && !parent.closest('code')) {
            let v = tn.nodeValue || '';
            if (/(?:&lt;\/?code&gt;|<\/?code>)/i.test(v)) {
              // strip any occurrences and collapse whitespace
              v = v.replace(/(?:&lt;\/?code&gt;|<\/?code>)/gi, '');
              v = v.replace(/\s+/g, ' ');
              tn.nodeValue = v.trim() ? v : '';
            }
          }
        } catch {}
        tn = walker.nextNode();
      }

      // Unwrap single <p> child inside <li> to produce <li>text/inline...</li>
      doc.querySelectorAll('li').forEach((li) => {
        const directPs = Array.from(li.children).filter(
          (ch) => ch.tagName === 'P'
        ) as HTMLParagraphElement[];
        if (directPs.length === 1 && li.childElementCount === 1) {
          // replace li inner with paragraph inner
          li.innerHTML = directPs[0].innerHTML;
        }
        // Also unwrap any direct <p> children (multiple) while preserving order
        if (directPs.length > 0 && li.childElementCount === directPs.length) {
          const fragments: string[] = [];
          directPs.forEach((p) => {
            fragments.push(p.innerHTML);
          });
          li.innerHTML = fragments.join('\n');
        }
      });
      // Remove empty paragraphs not inside list items
      doc.querySelectorAll('p').forEach((p) => {
        if (p.closest('li')) return;
        const hasContent =
          /\S/.test((p.textContent || '').replace(/\u00a0/g, ' ')) ||
          p.querySelector('img,video,iframe,code,strong,em,a,span:not(:empty)');
        if (!hasContent) p.remove();
      });
      let output = stripListParagraphs(doc.body.innerHTML);
      // Remove trailing empty paragraphs
      output = output.replace(/(?:<p>\s*<\/p>)+$/i, '');
      return output;
    } catch {
      return stripListParagraphs(cleaned);
    }
  }, []);

  // Pretty format HTML for source view
  const formatHtml = useCallback((html: string) => {
    try {
      const container = document.createElement('div');
      container.innerHTML = html;
      const voidTags = new Set([
        'area',
        'base',
        'br',
        'col',
        'embed',
        'hr',
        'img',
        'input',
        'link',
        'meta',
        'param',
        'source',
        'track',
        'wbr',
      ]);
      const lines: string[] = [];
      const indentChar = '  ';
      const formatNode = (node: Node, depth: number) => {
        if (node.nodeType === Node.TEXT_NODE) {
          // Preserve raw whitespace for text inside <pre> or <code>; otherwise collapse whitespace
          const parentEl = (node as any).parentElement as HTMLElement | null;
          const insidePre =
            parentEl && parentEl.closest && parentEl.closest('pre,code');
          const raw = node.textContent || '';
          if (insidePre) {
            // Keep original lines and indentation inside code blocks
            const parts = raw.split('\n');
            parts.forEach((p) => {
              lines.push(indentChar.repeat(depth) + p);
            });
            return;
          }
          const text = raw.replace(/\s+/g, ' ').trim();
          if (text) lines.push(indentChar.repeat(depth) + text);
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const attrs = Array.from(el.attributes)
          .map((a) => `${a.name}="${a.value}"`)
          .join(' ');
        const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
        if (voidTags.has(tag)) {
          lines.push(indentChar.repeat(depth) + open);
          return;
        }
        // For <pre> / <code> keep innerHTML as-is to preserve highlighted markup and spacing
        if (tag === 'pre' || tag === 'code') {
          lines.push(indentChar.repeat(depth) + open);
          // Escape any angle brackets inside code/pre so the formatted source
          // contains literal text (prevents the browser from parsing them when
          // the user re-applies the source).
          const rawInner = el.innerHTML || '';
          const inner = rawInner.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const innerLines = inner.split('\n');
          innerLines.forEach((l) =>
            lines.push(indentChar.repeat(depth + 1) + l)
          );
          lines.push(indentChar.repeat(depth) + `</${tag}>`);
          return;
        }
        const childElements = Array.from(el.childNodes).filter(
          (ch) => ch.nodeType === Node.ELEMENT_NODE
        );
        const childTextRaw = Array.from(el.childNodes)
          .filter((ch) => ch.nodeType === Node.TEXT_NODE)
          .map((ch) => (ch.textContent || '').trim())
          .join('');
        const hasOnlyInlineText = childElements.length === 0 && !!childTextRaw;
        if (hasOnlyInlineText && childTextRaw.length < 80) {
          lines.push(
            indentChar.repeat(depth) +
              open.replace(/>$/, '') +
              '>' +
              childTextRaw +
              `</${tag}>`
          );
          return;
        }
        lines.push(indentChar.repeat(depth) + open);
        el.childNodes.forEach((ch) => formatNode(ch, depth + 1));
        lines.push(indentChar.repeat(depth) + `</${tag}>`);
      };
      Array.from(container.childNodes).forEach((n) => formatNode(n, 0));
      return lines.join('\n');
    } catch {
      return html;
    }
  }, []);

  // Custom Image extension to persist data-align attribute explicitly
  const CustomImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        alt: { default: null },
        'data-align': {
          default: null,
          parseHTML: (element) => element.getAttribute('data-align'),
          renderHTML: (attributes) => {
            if (!attributes['data-align']) return {};
            return { 'data-align': attributes['data-align'] };
          },
        },
      };
    },
  });

  const editor = useEditor({
    // Prevent SSR hydration mismatch warning in Next.js
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        dropcursor: { width: 2, color: 'hsl(var(--primary))' },
      }),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight,
      HorizontalRule,
      HardBreak,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Heading';
          return placeholder;
        },
        emptyNodeClass:
          'is-empty text-muted-foreground before:content-[attr(data-placeholder)] before:pointer-events-none before:h-0 before:text-muted-foreground before:opacity-60',
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      CustomImage.configure({ inline: false, allowBase64: true }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      const raw = editor.getHTML();
      const html = sanitize(raw);
      // Mark the latest editor-driven value to prevent external sync from resetting selection
      lastInitRef.current = html;
      // debounce to reduce parent re-renders causing flicker
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onChange(html);
      }, 150);
      // live stats
      const text = editor.state.doc.textBetween(
        0,
        editor.state.doc.content.size,
        ' '
      );
      const words = (text.trim().match(/\S+/g) || []).length;
      setWordCount(words);
      setReadingTime(Math.max(1, Math.ceil(words / 200)) + ' min');
    },
    editorProps: {
      attributes: {
        class:
          'prose max-w-none focus:outline-none dark:prose-invert prose-p:my-3 prose-headings:mt-6 prose-headings:mb-2 prose-li:my-1 prose-img:my-4 prose-pre:my-4',
      },
      handlePaste: (view, event) => {
        try {
          if (!event.clipboardData) return false;
          const items = Array.from(event.clipboardData.items);
          const imageFiles: File[] = [];
          items.forEach((it) => {
            if (it.kind === 'file') {
              const f = it.getAsFile();
              if (f && f.type.startsWith('image/')) imageFiles.push(f);
            }
          });
          const html = event.clipboardData.getData('text/html');
          const plain = event.clipboardData.getData('text/plain');
          // Case 1: pure image(s) (e.g., screenshot) without rich text -> prevent default and upload
          if (imageFiles.length && !html && !plain) {
            event.preventDefault();
            processPastedImages(imageFiles);
            return true;
          }
          // Otherwise allow default paste to keep formatting/text, then async replace images
          setTimeout(() => {
            if (!editor) return;
            const queue: { pos: number; src: string; alt: string }[] = [];
            editor.state.doc.descendants((node: any, pos: number) => {
              if (
                node.type?.name === 'image' &&
                typeof node.attrs?.src === 'string'
              ) {
                const src: string = node.attrs.src;
                if (
                  /^data:/i.test(src) ||
                  (/^https?:\/\//i.test(src) &&
                    !/res\.cloudinary\.com\//i.test(src))
                ) {
                  queue.push({ pos, src, alt: node.attrs.alt || '' });
                }
              }
            });
            if (!queue.length) return;
            setUploading(true);
            (async () => {
              for (let i = 0; i < queue.length; i++) {
                const item = queue[i];
                try {
                  let newUrl: string | null = null;
                  if (/^data:/i.test(item.src)) {
                    const file = dataUriToFile(
                      item.src,
                      `pasted-${Date.now()}-${i}.png`
                    );
                    if (file) {
                      const { url } = await uploadImage(file);
                      newUrl = url;
                    }
                  } else {
                    const res = await fetch('/api/cloudinary/fetch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: item.src }),
                    });
                    const data = await res.json();
                    newUrl = data.optimized_url || data.secure_url || null;
                  }
                  if (newUrl) {
                    // Re-select image node at current pos and update
                    if (editor) {
                      editor
                        .chain()
                        .setNodeSelection(item.pos)
                        .updateAttributes('image', {
                          src: newUrl,
                          alt: item.alt,
                        })
                        .run();
                    }
                  }
                } catch (e) {
                  console.error('Rehost image failed', e);
                }
              }
              setUploading(false);
              setTimeout(() => setUploadProgress(null), 400);
            })();
          }, 30);
        } catch (e) {
          console.error('Paste handler error', e);
        }
        return false;
      },
    },
  });

  // Only update content when external value changes meaningfully & differs from editor (avoid loop)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const currentSanitized = sanitize(current);
    // Only push external value into the editor if it truly differs from what's inside
    if (
      !showSource &&
      value &&
      value !== currentSanitized &&
      value !== lastInitRef.current
    ) {
      editor.commands.setContent(sanitize(value), false);
      lastInitRef.current = value;
    }
  }, [value, editor, showSource, sanitize]);

  // When toggling into source mode, snapshot current HTML.
  useEffect(() => {
    if (showSource && editor) {
      const html = editor.getHTML();
      // Auto-format when opening source view for readability, but keep a raw snapshot
      const pretty = formatHtml(html);
      setSourceSnapshot(html);
      setSourceBaseline(pretty);
      setSourceValue(pretty);
      setSourceDirty(false);
      // next frame to ensure DOM has textarea before measuring
      setTimeout(() => adjustSourceHeight(), 0);
    }
  }, [showSource, editor, formatHtml, adjustSourceHeight]);

  // Recalculate height when the source value changes while in source mode
  useEffect(() => {
    if (showSource) adjustSourceHeight();
  }, [sourceValue, showSource, adjustSourceHeight]);

  // Recalculate on window resize while in source mode
  useEffect(() => {
    if (!showSource) return;
    const onResize = () => adjustSourceHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [showSource, adjustSourceHeight]);

  // Convert any pre-existing <h1> to <h2> since H1 is disabled now
  useEffect(() => {
    if (!editor) return;
    const html = editor.getHTML();
    if (html.includes('<h1')) {
      const converted = html
        .replace(/<h1(.*?)>/g, '<h2$1>')
        .replace(/<\/h1>/g, '</h2>');
      if (converted !== html) {
        editor.commands.setContent(sanitize(converted), false);
        lastInitRef.current = converted;
        if (showSource) setSourceValue(converted);
      }
    }
  }, [editor, showSource, sanitize]);

  // Auto-save to localStorage every 10s if changed
  useEffect(() => {
    if (!editor) return;
    const interval = setInterval(() => {
      const html = sanitize(editor.getHTML());
      if (lastAutoSave === null || html !== localStorage.getItem(autosaveKey)) {
        setSaving(true);
        localStorage.setItem(autosaveKey, html);
        setLastAutoSave(Date.now());
        setTimeout(() => setSaving(false), 400);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [editor, sanitize, lastAutoSave]);

  // hide emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node))
        setShowEmoji(false);
    };
    if (showEmoji) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  // Handle toolbar fixation to viewport top
  useEffect(() => {
    const handle = () => {
      if (!wrapperRef.current || !toolbarRef.current) return;
      const wrapRect = wrapperRef.current.getBoundingClientRect();
      const toolRect = toolbarRef.current.getBoundingClientRect();
      const shouldFix =
        wrapRect.top < toolbarOffset &&
        wrapRect.bottom - toolRect.height > toolbarOffset + 20;
      if (shouldFix) {
        if (!fixedToolbar) {
          const h = toolbarRef.current?.getBoundingClientRect().height || 0;
          setToolbarHeight(h);
          setFixedToolbar(true);
          setToolbarStyle({ width: wrapRect.width, left: wrapRect.left });
        } else {
          // update position if width/left changed (resize)
          if (
            wrapRect.width !== toolbarStyle.width ||
            wrapRect.left !== toolbarStyle.left
          ) {
            setToolbarStyle({ width: wrapRect.width, left: wrapRect.left });
          }
        }
      } else if (fixedToolbar) {
        setFixedToolbar(false);
      }
    };
    window.addEventListener('scroll', handle, { passive: true });
    window.addEventListener('resize', handle);
    handle();
    return () => {
      window.removeEventListener('scroll', handle);
      window.removeEventListener('resize', handle);
    };
  }, [fixedToolbar, toolbarStyle.width, toolbarStyle.left, toolbarOffset]);

  // Copy toolbar button titles into aria-labels so icon-only controls announce meaningful names
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    toolbar
      .querySelectorAll<HTMLButtonElement>('button[title]:not([aria-label])')
      .forEach((btn) => {
        const label = btn.getAttribute('title');
        if (label) btn.setAttribute('aria-label', label);
      });
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Sync link state when selection changes
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      if (editor.isActive('link')) {
        const attrs = editor.getAttributes('link') || {};
        setLinkHref(attrs.href || '');
        setLinkBlank(attrs.target === '_blank');
        const rel: string = attrs.rel || '';
        const tokens = new Set(rel.split(/\s+/).filter(Boolean));
        setRelNoFollow(tokens.has('nofollow'));
        setRelNoOpener(tokens.has('noopener'));
        setRelNoReferrer(tokens.has('noreferrer'));
      }
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    update();
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  const applyLinkEdit = () => {
    if (!editor) return;
    if (!linkHref) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const relParts: string[] = [];
    if (relNoOpener) relParts.push('noopener');
    if (relNoReferrer) relParts.push('noreferrer');
    if (relNoFollow) relParts.push('nofollow');
    const rel = relParts.join(' ') || null;
    const target = linkBlank ? '_blank' : null;
    // Explicitly pass null to remove attributes when unchecked
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkHref, target, rel })
      .run();
    // Move caret just after link to close link bubble
    const { to } = editor.state.selection;
    const pos = Math.min(to, editor.state.doc.content.size);
    editor.chain().setTextSelection(pos).focus().run();
  };
  const removeLink = () => {
    if (editor) editor.chain().focus().unsetLink().run();
  };

  const startFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !editor) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large (max 10MB)');
      return;
    }
    try {
      setUploading(true);
      setUploadProgress(0);
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('file', file);
      const upload = () =>
        new Promise<any>((resolve, reject) => {
          xhr.open('POST', '/api/cloudinary/upload');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Invalid response'));
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(fd);
        });
      const res = await upload();
      if (res.secure_url) {
        const alt = window.prompt('Alt text (optional)') || '';
        editor
          .chain()
          .focus()
          .setImage({ src: res.optimized_url || res.secure_url, alt })
          .run();
      } else {
        alert(res.error?.message || 'Upload failed');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Upload error');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 400);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Track selected image alt text (must come before any early return to preserve hook order)
  const [imageActive, setImageActive] = useState(false);
  // Track selection changes to know when an image is selected
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const active = editor.isActive('image');
      setImageActive(active);
      if (active) {
        const attrs = editor.getAttributes('image');
        setAltDraft(attrs.alt || '');
        // store current image position so we can re-select when focus is inside inputs
        const sel = editor.state.selection;
        lastImagePos.current = sel.from;
      }
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    update();
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  // Helper: disallow applying inline marks when selection is inside a heading
  const isInsideHeading = useCallback(() => {
    if (!editor) return false;
    try {
      const { $from } = editor.state.selection;
      return $from.parent.type.name === 'heading';
    } catch {
      return false;
    }
  }, [editor]);

  const toggleIfAllowed = (fn: () => void) => {
    if (isInsideHeading()) {
      // silently ignore formatting inside headings to keep headings plain
      return;
    }
    fn();
  };

  if (!editor)
    return (
      <div
        className={cn(
          'border rounded-md p-3 text-sm text-muted-foreground',
          className
        )}
      >
        Loading editor...
      </div>
    );

  const btnBase =
    'h-8 w-8 flex items-center justify-center rounded-md text-xs font-medium transition-colors select-none';
  const btn = (active: boolean) =>
    cn(
      btnBase,
      active
        ? 'bg-secondary text-secondary-foreground shadow-inner'
        : 'hover:bg-muted text-muted-foreground'
    );
  const smallBtn = (active = false) =>
    cn(
      'h-7 px-2 text-xs rounded-md flex items-center gap-1 border',
      active
        ? 'bg-secondary text-secondary-foreground'
        : 'bg-muted/40 hover:bg-muted'
    );
  const emojiList = [
    '😀',
    '😅',
    '😊',
    '🔥',
    '🚀',
    '👍',
    '💡',
    '✅',
    '🎯',
    '⚠️',
    '🐛',
    '✨',
  ];
  const insertEmoji = (e: string) => {
    editor
      ?.chain()
      .focus()
      .insertContent(e + ' ')
      .run();
    setShowEmoji(false);
  };
  const insideTable = !!editor?.isActive('table');

  const reselectImage = () => {
    if (!editor) return false;
    if (imageActive) return true;
    if (lastImagePos.current != null) {
      editor.chain().setNodeSelection(lastImagePos.current).run();
      return true;
    }
    return false;
  };
  const applyAlt = () => {
    if (!editor) return;
    if (!imageActive) reselectImage();
    // position after image to close bubble menu
    const sel = editor.state.selection;
    const after = Math.min(sel.to + 1, editor.state.doc.content.size);
    editor
      .chain()
      .updateAttributes('image', { alt: altDraft })
      .setTextSelection(after)
      .focus()
      .run();
    toast({ title: 'Alt text updated' });
  };
  const setImgAlign = (align: 'left' | 'center' | 'right' | null) => {
    if (!editor) return;
    if (!imageActive) reselectImage();
    const current = editor.getAttributes('image')?.['data-align'] || null;
    const next = align === current ? null : align;
    editor
      .chain()
      .updateAttributes('image', { 'data-align': next || null })
      .focus()
      .run();
  };

  // --- Paste image handling (upload to Cloudinary & insert URL) ---
  const uploadImage = (file: File): Promise<{ url: string }> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/'))
        return reject(new Error('Not an image'));
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('file', file);
      xhr.open('POST', '/api/cloudinary/upload');
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.secure_url || res.optimized_url) {
            resolve({ url: res.optimized_url || res.secure_url });
          } else reject(new Error(res.error?.message || 'Upload failed'));
        } catch {
          reject(new Error('Invalid response'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(fd);
    });
  };

  const base64ImageRegex =
    /<img[^>]*src=["']data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)["'][^>]*>/gi;
  const dataUriToFile = (dataUri: string, fileName: string): File | null => {
    try {
      const match = dataUri.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
      );
      if (!match) return null;
      const mime = match[1];
      const b64 = match[2];
      const bin = atob(b64);
      const len = bin.length;
      const arr = new Uint8Array(len);
      for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
      return new File([arr], fileName, { type: mime });
    } catch {
      return null;
    }
  };

  const processPastedImages = async (files: File[]) => {
    if (!editor || !files.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.size > 10 * 1024 * 1024) continue; // skip too large
        try {
          const { url } = await uploadImage(f);
          const alt = ''; // skip prompt on paste for speed; could prompt if desired
          editor.chain().focus().setImage({ src: url, alt }).run();
        } catch (e) {
          console.error('Paste upload failed', e);
        }
      }
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 400);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'border rounded-lg bg-background relative group',
        className
      )}
    >
      <div
        ref={toolbarRef}
        className={cn(
          'flex flex-wrap items-center gap-1 border-b p-2 bg-muted/40 z-30 transition-shadow',
          fixedToolbar && 'shadow-md'
        )}
        style={
          fixedToolbar
            ? {
                position: 'fixed',
                top: toolbarOffset,
                left: toolbarStyle.left,
                width: toolbarStyle.width,
                background: 'hsl(var(--muted) / 0.9)',
                backdropFilter: 'blur(6px)',
              }
            : {}
        }
      >
        <button
          type="button"
          className={btn(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive('strike'))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        {[2, 3, 4].map((l) => (
          <button
            key={l}
            type="button"
            className={btn(editor.isActive('heading', { level: l }))}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({ level: l as any })
                .run()
            }
            title={`Heading ${l}`}
          >
            H{l}
          </button>
        ))}
        <button
          type="button"
          className={btn(editor.isActive('underline'))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive('highlight'))}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </button>
        <span className="w-px h-6 bg-border mx-1" />
        <button
          type="button"
          className={btn(editor.isActive({ textAlign: 'left' }))}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive({ textAlign: 'center' }))}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive({ textAlign: 'right' }))}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive({ textAlign: 'justify' }))}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </button>
        <span className="w-px h-6 bg-border mx-1" />
        <button
          type="button"
          className={btn(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive('blockquote'))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive('codeBlock'))}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <Code2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive('code'))}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline code"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(editor.isActive('table'))}
          onClick={() => {
            if (editor.isActive('table'))
              editor.chain().focus().deleteTable().run();
            else
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run();
          }}
          title={editor.isActive('table') ? 'Remove table' : 'Insert table'}
        >
          <TableIcon className="h-4 w-4" />
        </button>
        <span className="w-px h-6 bg-border mx-1" />
        <button
          type="button"
          className={btn(editor.isActive('link'))}
          onClick={setLink}
          title="Insert link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={startFileDialog}
          title="Upload image"
          disabled={uploading}
        >
          {uploading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                opacity="0.25"
              />
              <path
                d="M22 12a10 10 0 0 1-10 10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          className={btn(showSource)}
          onClick={() => {
            if (showSource && editor) {
              // Leaving source mode: only apply if user edited the HTML
              const edited = sourceDirty || sourceValue !== sourceBaseline;
              if (edited) {
                const sanitized = sanitize(sourceValue);
                editor.commands.setContent(sanitized, false);
                lastInitRef.current = sanitized;
                try {
                  onChange(sanitized);
                } catch {}
              }
            }
            setShowSource((s) => !s);
          }}
          title={showSource ? 'Exit source view' : 'View HTML source'}
        >
          <Braces className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() => setShowEmoji((v) => !v)}
          title="Emoji picker"
        >
          <Smile className="h-4 w-4" />
        </button>
        {showEmoji && (
          <div
            ref={emojiRef}
            className="absolute z-50 mt-2 grid grid-cols-6 gap-1 p-2 bg-popover border rounded-md shadow-md"
            style={{ top: fixedToolbar ? toolbarOffset + 50 : undefined }}
          >
            {emojiList.map((em) => (
              <button
                key={em}
                type="button"
                className="h-8 w-8 hover:bg-muted rounded"
                onClick={() => insertEmoji(em)}
              >
                {em}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="text-[11px] text-muted-foreground whitespace-nowrap">
            {wordCount} words • {readingTime} •{' '}
            {saving ? 'Saving…' : lastAutoSave ? 'Saved' : 'Draft'}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className={btn(false)}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={btn(false)}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {fixedToolbar && <div style={{ height: toolbarHeight }} />}
      {insideTable && (
        <div className="flex flex-wrap gap-2 p-2 border-b bg-muted/30 text-xs">
          <span className="font-medium text-muted-foreground pr-2">Table</span>
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            title="Add column before"
          >
            <Columns2 className="h-3 w-3" />
            +L
          </button>
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Add column after"
          >
            <Columns3 className="h-3 w-3" />
            +R
          </button>
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Delete column"
          >
            <Columns2 className="h-3 w-3 rotate-180" />-
          </button>
          <span className="w-px h-5 bg-border" />
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().addRowBefore().run()}
            title="Add row before"
          >
            <Rows2 className="h-3 w-3" />
            +T
          </button>
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Add row after"
          >
            <Rows3 className="h-3 w-3" />
            +B
          </button>
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Delete row"
          >
            <Rows2 className="h-3 w-3 rotate-180" />-
          </button>
          <span className="w-px h-5 bg-border" />
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            title="Toggle header row"
          >
            Hdr
          </button>
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().mergeCells().run()}
            title="Merge cells"
          >
            Merge
          </button>
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().splitCell().run()}
            title="Split cell"
          >
            Split
          </button>
          <button
            type="button"
            className={smallBtn()}
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Delete table"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <span className="text-muted-foreground">
            (Drag borders to resize)
          </span>
        </div>
      )}
      <div
        style={{ minHeight }}
        className="p-4 bg-background prose-sm overflow-y-auto relative"
      >
        {editor && (
          <>
            <BubbleMenu
              editor={editor}
              shouldShow={({ editor, state, view }) => {
                try {
                  if (showSource) return false;
                  if (
                    !view ||
                    !view.dom ||
                    !view.dom.ownerDocument.contains(view.dom)
                  )
                    return false;
                  if (editor.isActive('link')) return false; // separate link menu
                  if (editor.isActive('image')) return false; // handled by image menu
                  const sel = state.selection;
                  if (sel.empty) return false;
                  if (!view.hasFocus()) return false;
                  const text = editor.state.doc
                    .textBetween(sel.from, sel.to)
                    .replace(/\s+/g, ' ')
                    .trim();
                  if (!text) return false;
                  return true;
                } catch {
                  return false;
                }
              }}
              tippyOptions={{
                duration: 150,
                appendTo: () => document.body,
                onShow(instance) {
                  if (!editor || showSource) return false;
                },
              }}
              className="flex gap-1 rounded-md border bg-popover p-1 shadow-md"
            >
              <button
                type="button"
                className={btn(editor.isActive('bold')) + ' h-7 w-7'}
                onClick={() => editor.chain().focus().toggleBold().run()}
                title="Bold"
              >
                <Bold className="h-3 w-3" />
              </button>
              <button
                type="button"
                className={btn(editor.isActive('italic')) + ' h-7 w-7'}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                title="Italic"
              >
                <Italic className="h-3 w-3" />
              </button>
              <button
                type="button"
                className={btn(editor.isActive('strike')) + ' h-7 w-7'}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                title="Strikethrough"
              >
                <Strikethrough className="h-3 w-3" />
              </button>
              <button
                type="button"
                className={btn(editor.isActive('code')) + ' h-7 w-7'}
                onClick={() => editor.chain().focus().toggleCode().run()}
                title="Inline code"
              >
                <Code className="h-3 w-3" />
              </button>
              <button
                type="button"
                className={btn(editor.isActive('link')) + ' h-7 w-7'}
                onClick={setLink}
                title="Link"
              >
                <LinkIcon className="h-3 w-3" />
              </button>
            </BubbleMenu>
            <BubbleMenu
              editor={editor}
              shouldShow={({ editor, view }) => {
                try {
                  if (showSource) return false;
                  if (
                    !view ||
                    !view.dom ||
                    !view.dom.ownerDocument.contains(view.dom)
                  )
                    return false;
                  if (!editor.isActive('image')) return false;
                  if (!view.hasFocus()) return false;
                  return true;
                } catch {
                  return false;
                }
              }}
              tippyOptions={{
                duration: 120,
                appendTo: () => document.body,
                onShow(instance) {
                  if (showSource) return false;
                },
              }}
              className="flex flex-col gap-2 rounded-md border bg-popover p-2 shadow-md text-xs min-w-64"
            >
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Image Align
                </span>
                <div className="flex gap-1 ml-auto">
                  <button
                    type="button"
                    className={btn(
                      imageActive &&
                        editor.getAttributes('image')['data-align'] === 'left'
                    )}
                    onClick={() => setImgAlign('left')}
                    title="Align left"
                  >
                    <AlignLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className={btn(
                      imageActive &&
                        editor.getAttributes('image')['data-align'] === 'center'
                    )}
                    onClick={() => setImgAlign('center')}
                    title="Align center"
                  >
                    <AlignCenter className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className={btn(
                      imageActive &&
                        editor.getAttributes('image')['data-align'] === 'right'
                    )}
                    onClick={() => setImgAlign('right')}
                    title="Align right"
                  >
                    <AlignRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Alt Text
                </label>
                <div className="flex gap-1">
                  <input
                    value={altDraft}
                    onChange={(e) => setAltDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applyAlt();
                        e.preventDefault();
                      }
                    }}
                    placeholder="Describe image"
                    className="flex-1 px-2 py-1 rounded-md border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={applyAlt}
                    className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90"
                  >
                    Save
                  </button>
                </div>
              </div>
            </BubbleMenu>
            <BubbleMenu
              editor={editor}
              shouldShow={({ editor, view }) => {
                try {
                  if (showSource) return false;
                  if (
                    !view ||
                    !view.dom ||
                    !view.dom.ownerDocument.contains(view.dom)
                  )
                    return false;
                  if (!editor.isActive('link')) return false;
                  if (!view.hasFocus()) return false;
                  return true;
                } catch {
                  return false;
                }
              }}
              tippyOptions={{ duration: 150, appendTo: () => document.body }}
              className="flex flex-col gap-2 rounded-md border bg-popover p-2 shadow-md text-xs min-w-72"
            >
              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Link URL
                </label>
                <input
                  className="px-2 py-1 rounded-md border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="https://example.com"
                  value={linkHref}
                  onChange={(e) => setLinkHref(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      applyLinkEdit();
                      e.preventDefault();
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={linkBlank}
                    onChange={(e) => setLinkBlank(e.target.checked)}
                    className="accent-primary"
                  />{' '}
                  New tab (_blank)
                </label>
                <label className="flex items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={relNoFollow}
                    onChange={(e) => setRelNoFollow(e.target.checked)}
                    className="accent-primary"
                  />{' '}
                  nofollow
                </label>
                <label className="flex items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={relNoOpener}
                    onChange={(e) => setRelNoOpener(e.target.checked)}
                    className="accent-primary"
                  />{' '}
                  noopener
                </label>
                <label className="flex items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={relNoReferrer}
                    onChange={(e) => setRelNoReferrer(e.target.checked)}
                    className="accent-primary"
                  />{' '}
                  noreferrer
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={removeLink}
                  className="px-2 py-1 rounded-md border bg-destructive/10 text-destructive text-xs hover:bg-destructive/20"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={applyLinkEdit}
                  className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </BubbleMenu>
            <FloatingMenu
              editor={editor}
              tippyOptions={{ duration: 120 }}
              shouldShow={({ editor }) => {
                if (showSource) return false;
                const { $from } = editor.state.selection;
                const textBefore = $from.parent.textBetween(
                  0,
                  $from.parent.content.size,
                  '\n',
                  '\n'
                );
                return /\/[a-zA-Z0-9-]*$/.test(textBefore);
              }}
              className="rounded-md border bg-popover p-2 shadow-md text-sm max-h-80 overflow-auto w-60"
            >
              {(() => {
                const { $from } = editor.state.selection;
                const textBefore = $from.parent.textBetween(
                  0,
                  $from.parent.content.size,
                  '\n',
                  '\n'
                );
                const match = textBefore.match(/\/(\w*)$/);
                const query = (match?.[1] || '').toLowerCase();
                const items = [
                  {
                    label: 'Heading 2',
                    keywords: 'h2 heading2',
                    run: () =>
                      editor.chain().focus().toggleHeading({ level: 2 }).run(),
                  },
                  {
                    label: 'Heading 3',
                    keywords: 'h3 heading3',
                    run: () =>
                      editor.chain().focus().toggleHeading({ level: 3 }).run(),
                  },
                  {
                    label: 'Heading 4',
                    keywords: 'h4 heading4',
                    run: () =>
                      editor.chain().focus().toggleHeading({ level: 4 }).run(),
                  },
                  {
                    label: 'Bullet List',
                    keywords: 'ul bullet list',
                    run: () => editor.chain().focus().toggleBulletList().run(),
                  },
                  {
                    label: 'Numbered List',
                    keywords: 'ol ordered list',
                    run: () => editor.chain().focus().toggleOrderedList().run(),
                  },
                  {
                    label: 'Blockquote',
                    keywords: 'quote blockquote',
                    run: () => editor.chain().focus().toggleBlockquote().run(),
                  },
                  {
                    label: 'Code Block',
                    keywords: 'code block',
                    run: () => editor.chain().focus().toggleCodeBlock().run(),
                  },
                  {
                    label: 'Horizontal Rule',
                    keywords: 'hr horizontal rule line',
                    run: () => editor.chain().focus().setHorizontalRule().run(),
                  },
                  {
                    label: 'Table 3x3',
                    keywords: 'table grid',
                    run: () =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run(),
                  },
                  {
                    label: 'Image Upload',
                    keywords: 'image photo media',
                    run: () => startFileDialog(),
                  },
                  {
                    label: 'Bold',
                    keywords: 'bold strong',
                    run: () => editor.chain().focus().toggleBold().run(),
                  },
                  {
                    label: 'Italic',
                    keywords: 'italic emphasis',
                    run: () => editor.chain().focus().toggleItalic().run(),
                  },
                  {
                    label: 'Strikethrough',
                    keywords: 'strike strikethrough',
                    run: () => editor.chain().focus().toggleStrike().run(),
                  },
                  {
                    label: 'Underline',
                    keywords: 'underline',
                    run: () => editor.chain().focus().toggleUnderline().run(),
                  },
                  {
                    label: 'Highlight',
                    keywords: 'highlight mark',
                    run: () => editor.chain().focus().toggleHighlight().run(),
                  },
                ];
                const filtered = items.filter(
                  (i) => !query || i.keywords.includes(query)
                );
                const execute = (item: (typeof filtered)[number]) => {
                  const { $from } = editor.state.selection;
                  const textBefore = $from.parent.textBetween(
                    0,
                    $from.parent.content.size,
                    '\n',
                    '\n'
                  );
                  const m = textBefore.match(/\/[a-zA-Z0-9-]*$/);
                  if (m) {
                    const start = $from.pos - m[0].length;
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: start, to: $from.pos })
                      .run();
                  }
                  item.run();
                };
                if (!filtered.length)
                  return (
                    <div className="text-xs text-muted-foreground">
                      No matches
                    </div>
                  );
                return (
                  <ul className="flex flex-col gap-1">
                    {filtered.map((it) => (
                      <li key={it.label}>
                        <button
                          type="button"
                          className="w-full text-left px-2 py-1 rounded hover:bg-muted"
                          onClick={() => execute(it)}
                        >
                          {it.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
              <div className="pt-2 mt-2 border-t text-[10px] text-muted-foreground">
                Type / + keyword...
              </div>
            </FloatingMenu>
          </>
        )}
        {uploading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden rounded-t">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        )}
        {!showSource && (
          <EditorContent editor={editor} className="outline-none" />
        )}
        {showSource && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                className="px-2 py-1 text-xs rounded-md border bg-muted hover:bg-muted/70"
                onClick={() => {
                  setSourceValue((v) => formatHtml(v));
                  setSourceDirty(true);
                }}
              >
                Format
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90"
                onClick={() => {
                  if (!editor) return;
                  const sanitized = sanitize(sourceValue);
                  editor.commands.setContent(sanitized, false);
                  lastInitRef.current = sanitized;
                  try {
                    onChange(sanitized);
                  } catch {}
                }}
              >
                Apply
              </button>
            </div>
            <textarea
              ref={sourceAreaRef}
              className="w-full min-h-[300px] font-mono text-xs bg-muted/40 p-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary resize-none overflow-hidden"
              value={sourceValue}
              onChange={(e) => {
                setSourceValue(e.target.value);
                setSourceDirty(true);
                adjustSourceHeight();
              }}
              spellCheck={false}
            />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <style jsx global>{`
        .prose img[data-align='left'] {
          display: inline-block;
          margin: 0.25rem 1rem 0.5rem 0;
          vertical-align: top;
        }
        .prose img[data-align='right'] {
          display: inline-block;
          margin: 0.25rem 0 0.5rem 1rem;
          vertical-align: top;
          float: right;
        }
        .prose img[data-align='center'] {
          display: block;
          margin: 0.75rem auto;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
