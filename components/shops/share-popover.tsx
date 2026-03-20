'use client';

import { useAnalytics } from '@/lib/posthog/use-analytics';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const PLATFORMS = [
  { name: 'Threads', icon: '@', bg: '#1A1918', fg: '#FFFFFF', urlFn: (u: string) => `https://www.threads.net/intent/post?text=${encodeURIComponent(u)}` },
  { name: 'LINE', icon: 'L', bg: '#06C755', fg: '#FFFFFF', urlFn: (u: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}` },
  { name: 'WhatsApp', icon: 'W', bg: '#25D366', fg: '#FFFFFF', urlFn: (u: string) => `https://wa.me/?text=${encodeURIComponent(u)}` },
  { name: 'Mail', icon: '✉', bg: '#F5F4F2', fg: '#3B2F2A', urlFn: (u: string, n: string) => `mailto:?subject=${encodeURIComponent(n)}&body=${encodeURIComponent(u)}` },
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

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    capture('shop_url_copied', { shop_id: shopId, copy_method: 'clipboard' });
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl overflow-hidden shadow-xl" align="start">
        <div className="px-4 py-4 border-b border-[#E5E4E1]">
          <h3 className="text-sm font-semibold text-[#3B2F2A]">Share</h3>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#F5F4F2] px-3 py-2.5">
            <div className="h-10 w-10 rounded-lg bg-[#E8E6E2] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#3B2F2A] truncate">{shopName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#E5E4E1] px-3 py-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-xs text-[#6B6560] bg-transparent outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="flex-shrink-0 rounded-lg bg-[#2D5A27] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Copy
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
                  className="h-11 w-11 rounded-full flex items-center justify-center text-base font-bold"
                  style={{ background: p.bg, color: p.fg }}
                >
                  {p.icon}
                </div>
                <span className="text-[10px] text-[#9E9893]">{p.name}</span>
              </a>
            ))}
            <div className="flex flex-col items-center gap-1">
              <div className="h-11 w-11 rounded-full bg-[#F5F4F2] flex items-center justify-center text-base text-[#6B6560]">
                &bull;&bull;&bull;
              </div>
              <span className="text-[10px] text-[#9E9893]">More</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
