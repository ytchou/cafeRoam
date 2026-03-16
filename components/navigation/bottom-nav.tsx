'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/',        label: '地圖' },
  { href: '/explore', label: '探索' },
  { href: '/lists',   label: '收藏' },
  { href: '/profile', label: '我的' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed right-0 bottom-0 left-0 z-40 border-t border-gray-100 bg-white">
      <div className="flex">
        {TABS.map(({ href, label }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              data-active={isActive}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                isActive ? 'text-[#E06B3F]' : 'text-gray-400'
              }`}
            >
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
