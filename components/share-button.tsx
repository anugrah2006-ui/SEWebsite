'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { site } from '@/lib/seo';
import {
  Share2,
  Copy,
  Twitter,
  Linkedin,
  Facebook,
  Link2,
  Mail,
  Send,
  MessageCircle,
  Globe,
} from 'lucide-react';

type Props = {
  url: string;
  title: string;
  description?: string;
  author?: string;
  className?: string;
};

export default function ShareButton({
  url,
  title,
  description,
  author,
  className,
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const message = useMemo(() => {
    const base = description?.trim() ? ` ${description.trim()}` : '';
    const by = author ? ` by ${author}` : '';
    return `${title}${by} — ${site.name}.${base ? ' ' + base : ''}`.trim();
  }, [title, description, author]);

  const encoded = useMemo(
    () => ({
      url: encodeURIComponent(url),
      title: encodeURIComponent(title),
      message: encodeURIComponent(message),
      description: encodeURIComponent(description || ''),
      site: encodeURIComponent(site.name),
    }),
    [url, title, message, description]
  );

  // Twitter-specific: truncate only the description portion to respect Tweet length
  const twitterText = useMemo(() => {
    const TW_MAX = 280;
    const URL_RESERVED = 24; // t.co shortened link length + a space buffer
    const SAFETY = 2; // extra buffer for separators/edge cases
    const MAX_TEXT = TW_MAX - URL_RESERVED - SAFETY;

    const by = author ? ` by ${author}` : '';
    const base = `${title}${by}`;
    if (!description) return base;

    const remain = MAX_TEXT - base.length - 1; // space before description
    if (remain <= 0) return base;

    const clean = description.trim();
    if (clean.length <= remain) return `${base} ${clean}`;

    // truncate at word boundary and add ellipsis
    const slice = clean.slice(0, Math.max(0, remain - 1));
    const lastSpace = slice.lastIndexOf(' ');
    const trimmed = (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim();
    return `${base} ${trimmed}…`;
  }, [title, author, description]);

  const tryNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ url, title, text: message });
        return;
      } catch {
        // fallthrough to menu
      }
    }
    setOpen(true);
  }, [url, message]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Share it anywhere.' });
    } catch {
      toast({
        title: 'Copy failed',
        description: url,
        variant: 'destructive' as any,
      });
    }
  }, [url, toast]);

  const openShare = useCallback((shareUrl: string) => {
    try {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
  }, []);

  const links = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encoded.url}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encoded.url}&title=${encoded.title}&summary=${encoded.description}&source=${encoded.site}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded.url}`,
    reddit: `https://www.reddit.com/submit?url=${encoded.url}&title=${encoded.title}`,
    whatsapp: `https://wa.me/?text=${encoded.message}%20${encoded.url}`,
    telegram: `https://t.me/share/url?url=${encoded.url}&text=${encoded.message}`,
    email: `mailto:?subject=${encoded.title}&body=${encoded.message}%20${encoded.url}`,
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className + ' sm:h-10 sm:px-4'}
          onClick={tryNativeShare}
          aria-label="Share"
        >
          <Share2 className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => openShare(links.twitter)}>
          <Twitter className="h-4 w-4 mr-2 text-sky-500" /> Post on X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShare(links.linkedin)}>
          <Linkedin className="h-4 w-4 mr-2 text-sky-700" /> Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShare(links.facebook)}>
          <Facebook className="h-4 w-4 mr-2 text-blue-600" /> Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShare(links.reddit)}>
          <Globe className="h-4 w-4 mr-2" /> Share on Reddit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShare(links.whatsapp)}>
          <MessageCircle className="h-4 w-4 mr-2 text-green-600" /> Share on
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShare(links.telegram)}>
          <Send className="h-4 w-4 mr-2 text-sky-500" /> Share on Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShare(links.email)}>
          <Mail className="h-4 w-4 mr-2" /> Share via Email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyLink}>
          <Link2 className="h-4 w-4 mr-2" /> Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
