'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Map, Heart, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: '首頁', icon: Home },
  { href: '/explore', label: '探索', icon: Compass },
  { href: '/find', label: '地圖', icon: Map },
  { href: '/lists', label: '收藏', icon: Heart },
  { href: '/profile', label: '我的', icon: User },
];

export function BottomNav({ embedded }: { embedded?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className={embedded ? 'px-4' : 'fixed right-0 bottom-0 left-0 z-40 px-4'}
      style={
        embedded
          ? undefined
          : { paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }
      }
    >
      <div
        data-testid="tab-bar-pill"
        className="flex h-[62px] rounded-[36px] bg-white p-1 shadow-[0_4px_20px_#0000001A]"
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              data-tab={label}
              data-active={isActive || undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[26px] font-[family-name:var(--font-body)] text-[11px] font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--active-dark)] text-white'
                  : 'text-[var(--text-tertiary)]'
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
