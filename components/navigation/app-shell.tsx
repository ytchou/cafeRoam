'use client';
import { usePathname } from 'next/navigation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { BottomNav } from './bottom-nav';
import { Footer } from './footer';
import { HeaderNav } from './header-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const isFindPage = pathname === '/';

  return (
    <>
      {isDesktop && !isFindPage && <HeaderNav />}
      <main
        // pb-16 on mobile non-find pages offsets the fixed BottomNav (h-[62px] + margin).
        // The find page ('/') manages its own layout via MapMobileLayout with embedded BottomNav.
        className={
          isDesktop && !isFindPage ? 'pt-16' : isFindPage ? '' : 'pb-16'
        }
      >
        {children}
      </main>
      {!isFindPage && <Footer />}
      {!isDesktop && !isFindPage && <BottomNav />}
    </>
  );
}
