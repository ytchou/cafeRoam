import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '地圖瀏覽 | 啡遊 CafeRoam',
  description: '在地圖上探索台灣的獨立咖啡廳',
};

export default function FindLayout({ children }: { children: React.ReactNode }) {
  return children;
}
