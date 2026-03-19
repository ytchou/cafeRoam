'use client';
import { usePathname } from 'next/navigation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { BottomNavNew } from './bottom-nav-new';
import { HeaderNavNew } from './header-nav-new';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const isFindPage = pathname === '/';

  return (
    <>
      {isDesktop && !isFindPage && <HeaderNavNew />}
      <main className={isDesktop && !isFindPage ? 'pt-16' : isFindPage ? '' : 'pb-16'}>
        {children}
      </main>
      {!isDesktop && !isFindPage && <BottomNavNew />}
    </>
  );
}
