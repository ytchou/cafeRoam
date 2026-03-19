import type { Metadata, Viewport } from 'next';
import {
  Bricolage_Grotesque,
  DM_Sans,
  Geist,
  Geist_Mono,
  Noto_Sans_TC,
} from 'next/font/google';

import { PostHogProvider } from '@/lib/posthog/provider';
import { SessionTracker } from '@/components/session-tracker';
import { AppShell } from '@/components/navigation/app-shell';
import { Agentation } from 'agentation';
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
  title: 'CafeRoam 啡遊',
  description:
    "Discover Taiwan's best independent coffee shops with AI-powered semantic search.",
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
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
        <PostHogProvider>
          <SessionTracker />
          <AppShell>{children}</AppShell>
          {process.env.NODE_ENV === 'development' && <Agentation />}
        </PostHogProvider>
      </body>
    </html>
  );
}
