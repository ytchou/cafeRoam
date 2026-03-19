'use client';
import { usePathname } from 'next/navigation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { BottomNav } from './bottom-nav';
import { HeaderNav } from './header-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const isFindPage = pathname === '/';

  return (
    <>
      {isDesktop && !isFindPage && <HeaderNav />}
      <main className={isDesktop && !isFindPage ? 'pt-16' : isFindPage ? '' : 'pb-16'}>
        {children}
      </main>
      {!isDesktop && !isFindPage && <BottomNav />}
    </>
  );
}
