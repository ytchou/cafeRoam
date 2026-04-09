'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Map as MapIcon,
  Compass,
  User,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: LucideIcon;
  tab: string;
}[] = [
  { href: '/', label: 'Home', icon: Home, tab: 'home' },
  { href: '/find', label: 'Find', icon: MapIcon, tab: 'find' },
  { href: '/explore', label: 'Explore', icon: Compass, tab: 'explore' },
  { href: '/profile', label: 'Profile', icon: User, tab: 'profile' },
];
const NAV_ITEMS_BY_HREF = new Map(NAV_ITEMS.map((item) => [item.href, item]));

interface HeaderNavProps {
  activeTab?: string;
}

export function HeaderNav({ activeTab }: HeaderNavProps) {
  const pathname = usePathname();
  const currentTab =
    activeTab ?? NAV_ITEMS_BY_HREF.get(pathname)?.tab ?? 'home';

  return (
    <header className="border-border-light fixed top-0 right-0 left-0 z-40 flex h-16 items-center justify-between border-b bg-white px-8">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="bg-map-pin flex h-8 w-8 items-center justify-center rounded-lg">
          <span className="font-[family-name:var(--font-heading)] text-base font-bold text-white">
            啡
          </span>
        </div>
        <span className="text-foreground font-[family-name:var(--font-heading)] text-base font-bold">
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
              className={`flex h-9 items-center gap-[5px] rounded-[20px] px-4 font-[family-name:var(--font-body)] text-sm transition-colors ${
                isActive
                  ? 'bg-espresso font-semibold text-white'
                  : 'text-muted-foreground font-medium'
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
          className="bg-background text-muted-foreground flex h-9 w-9 items-center justify-center rounded-[18px]"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
        <div className="bg-map-pin flex h-8 w-8 items-center justify-center rounded-full">
          <span className="font-[family-name:var(--font-body)] text-sm font-semibold text-white">
            Y
          </span>
        </div>
      </div>
    </header>
  );
}
