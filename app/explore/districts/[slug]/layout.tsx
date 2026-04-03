import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '依區域探索',
  description: '依區域探索台灣最具特色的獨立咖啡廳。',
};

export default function DistrictsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
