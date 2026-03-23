'use client';

import { useState } from 'react';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const PLATFORMS = [
  {
    name: 'Threads',
    icon: '@',
    bg: 'var(--espresso)',
    fg: '#FFFFFF',
    urlFn: (u: string) =>
      `https://www.threads.net/intent/post?text=${encodeURIComponent(u)}`,
  },
  {
    name: 'LINE',
    icon: 'L',
    bg: '#06C755',
    fg: '#FFFFFF',
    urlFn: (u: string) =>
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}`,
  },
  {
    name: 'WhatsApp',
    icon: 'W',
    bg: '#25D366',
    fg: '#FFFFFF',
    urlFn: (u: string) => `https://wa.me/?text=${encodeURIComponent(u)}`,
  },
  {
    name: 'Mail',
    icon: '✉',
    bg: 'var(--surface-section)',
    fg: 'var(--text-body)',
    urlFn: (u: string, n: string) =>
      `mailto:?subject=${encodeURIComponent(n)}&body=${encodeURIComponent(u)}`,
  },
];

interface SharePopoverProps {
  shopId: string;
  shopName: string;
  shareUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
}

export function SharePopover({
  shopId,
  shopName,
  shareUrl,
  open,
  onOpenChange,
  trigger,
}: SharePopoverProps) {
  const { capture } = useAnalytics();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      capture('shop_url_copied', { shop_id: shopId, copy_method: 'clipboard' });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — URL is visible in the input for manual copy
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 overflow-hidden rounded-2xl p-0 shadow-xl"
        align="start"
      >
        <div className="border-b border-border-warm px-4 py-4">
          <h3 className="text-sm font-semibold text-text-body">Share</h3>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-surface-section px-3 py-2.5">
            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-border-warm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-body">
                {shopName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border-warm px-3 py-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 truncate bg-transparent text-xs text-text-secondary outline-none"
            />
            <button
              onClick={handleCopy}
              className="flex-shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="flex gap-3">
            {PLATFORMS.map((p) => (
              <a
                key={p.name}
                href={p.urlFn(shareUrl, shopName)}
                target="_blank"
                rel="noreferrer"
                aria-label={p.name}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-base font-bold"
                  style={{ background: p.bg, color: p.fg }}
                >
                  {p.icon}
                </div>
                <span className="text-[10px] text-text-meta">{p.name}</span>
              </a>
            ))}
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-section text-base text-text-secondary">
                &bull;&bull;&bull;
              </div>
              <span className="text-[10px] text-text-meta">More</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
