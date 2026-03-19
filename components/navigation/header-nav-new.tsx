'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Compass, Bookmark, User, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; tab: string }[] = [
  { href: '/', label: 'Find', icon: MapPin, tab: 'find' },
  { href: '/explore', label: 'Explore', icon: Compass, tab: 'explore' },
  { href: '/lists', label: 'Favorites', icon: Bookmark, tab: 'favorites' },
  { href: '/profile', label: 'Profile', icon: User, tab: 'profile' },
];

interface HeaderNavNewProps {
  activeTab?: string;
}

export function HeaderNavNew({ activeTab }: HeaderNavNewProps) {
  const pathname = usePathname();
  const currentTab = activeTab ?? (pathname === '/' ? 'find' : pathname.replace('/', ''));

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between h-16 px-8 bg-white border-b border-[#D1D0CD]">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--map-pin)]">
          <span className="font-[family-name:var(--font-heading)] text-base font-bold text-white">啡</span>
        </div>
        <span className="font-[family-name:var(--font-heading)] text-base font-bold text-[var(--foreground)]">
          啡遊 CafeRoam
        </span>
      </Link>

      <nav className="flex items-center gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, tab }) => {
          const isActive = currentTab === tab;
          return (
            <Link
              key={tab}
              href={href}
              data-active={isActive || undefined}
              className={`flex items-center gap-[5px] rounded-[20px] px-4 h-9 font-[family-name:var(--font-body)] text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--active-dark)] text-white font-semibold'
                  : 'text-[var(--muted-foreground)] font-medium'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Search"
          className="flex items-center justify-center h-9 w-9 rounded-[18px] bg-[var(--background)] text-[var(--muted-foreground)]"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--map-pin)]">
          <span className="font-[family-name:var(--font-body)] text-sm font-semibold text-white">Y</span>
        </div>
      </div>
    </header>
  );
}
