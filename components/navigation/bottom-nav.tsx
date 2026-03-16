'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, Compass, Heart, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/',        label: '地圖', icon: Map },
  { href: '/explore', label: '探索', icon: Compass },
  { href: '/lists',   label: '收藏', icon: Heart },
  { href: '/profile', label: '我的', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed right-0 bottom-0 left-0 z-40 border-t border-gray-100 bg-white">
      <div className="flex">
        {TABS.map(({ href, label, icon: Icon }) => {
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
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
