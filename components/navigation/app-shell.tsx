'use client';
import { usePathname } from 'next/navigation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { BottomNav } from './bottom-nav';
import { Footer } from './footer';
import { HeaderNav } from './header-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <>
      {isDesktop && !isHomePage && <HeaderNav />}
      <main
        // pb-16 on mobile non-home pages offsets the fixed BottomNav (h-[62px] + margin).
        // The home page ('/') manages its own layout via MapMobileLayout with embedded BottomNav.
        className={
          isDesktop && !isHomePage ? 'pt-16' : isHomePage ? '' : 'pb-16'
        }
      >
        {children}
      </main>
      {!isHomePage && (
        <div className={!isDesktop ? 'pb-16' : undefined}>
          <Footer />
        </div>
      )}
      {!isDesktop && !isHomePage && <BottomNav />}
    </>
  );
}
