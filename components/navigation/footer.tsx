import Link from 'next/link';
import { BuyMeACoffeeButton } from '@/components/buy-me-a-coffee-button';

const FOOTER_LINKS = [
  { href: '/about', label: '關於啡遊' },
  { href: '/faq', label: '常見問題' },
  { href: '/privacy', label: '隱私權政策' },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-[#e5e7eb] py-4">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 sm:flex-row sm:justify-between">
        <nav className="flex gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text-meta inline-flex min-h-[44px] items-center text-xs hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <BuyMeACoffeeButton />
      </div>
    </footer>
  );
}
