import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '依氛圍探索',
  description: '依氛圍標籤探索台灣最具特色的獨立咖啡廳。',
};

export default function VibesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
