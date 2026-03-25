import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '探索咖啡廳',
  description:
    '用不同方式探索台灣的獨立咖啡廳——隨機抽牌、依氛圍瀏覽、或看看社群最新打卡。',
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
