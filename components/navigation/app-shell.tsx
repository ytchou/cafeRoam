'use client';
import { usePathname } from 'next/navigation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { BuyMeACoffeeButton } from '@/components/buy-me-a-coffee-button';
import { BottomNav } from './bottom-nav';
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
      {isDesktop && !isFindPage && (
        <footer className="flex justify-center py-3 border-t border-[#e5e7eb]">
          <BuyMeACoffeeButton />
        </footer>
      )}
      {!isDesktop && !isFindPage && <BottomNav />}
    </>
  );
}
