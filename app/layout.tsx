import type { Metadata, Viewport } from 'next';
import {
  Bricolage_Grotesque,
  DM_Sans,
  Geist,
  Geist_Mono,
  Noto_Sans_TC,
} from 'next/font/google';

import { ConsentProvider } from '@/lib/consent/provider';
import { GA4Provider } from '@/lib/analytics/ga4';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import { PostHogProvider } from '@/lib/posthog/provider';
import { SWRProvider } from '@/components/swr-provider';
import { SessionTracker } from '@/components/session-tracker';
import { AppShell } from '@/components/navigation/app-shell';
import { Agentation } from 'agentation';
import { AppProgressBar } from 'next-nprogress-bar';
import { Toaster } from 'sonner';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const notoSansTC = Noto_Sans_TC({
  variable: '--font-noto-sans-tc',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://caferoam.tw'
  ),
  title: {
    default: 'CafeRoam 啡遊 — 探索台灣精品咖啡廳',
    template: '%s — 啡遊',
  },
  description:
    '啡遊 CafeRoam 幫你找到適合當下心情的台灣獨立咖啡廳——深度工作、放鬆休息、或朋友聚會。AI 語意搜尋，探索台灣精品咖啡文化。',
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    siteName: '啡遊 CafeRoam',
  },
  twitter: {
    card: 'summary_large_image',
  },
  appleWebApp: {
    capable: true,
    title: '啡遊',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#6F4E37',
  width: 'device-width',
  initialScale: 1,
};

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansTC.variable} ${bricolageGrotesque.variable} ${dmSans.variable} antialiased`}
      >
        <ConsentProvider>
          <GA4Provider />
          <SWRProvider>
            <PostHogProvider>
              <AppProgressBar
                color="#2c1810"
                height="3px"
                options={{ showSpinner: false }}
                shallowRouting={false}
              />
              <SessionTracker />
              <AppShell>{children}</AppShell>
              {process.env.NEXT_PUBLIC_AGENTATION_ENABLED === 'true' && (
                <Agentation />
              )}
              <Toaster position="bottom-center" />
            </PostHogProvider>
          </SWRProvider>
          <CookieConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
