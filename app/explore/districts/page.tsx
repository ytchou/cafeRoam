import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchDistricts } from '@/lib/api/districts';

export const metadata: Metadata = {
  title: '依區域探索咖啡廳 — 啡遊',
  description: '瀏覽台北各區的獨立咖啡廳——大安、中山、信義、松山等。',
};

export default async function DistrictsIndexPage() {
  const districts = await fetchDistricts();

  return (
    <main className="bg-surface-warm min-h-screen px-5 pt-6 pb-24">
      <h1
        className="text-text-primary mb-6 text-[28px] font-bold"
        style={{ fontFamily: 'var(--font-bricolage), var(--font-geist-sans), sans-serif' }}
      >
        Browse by District
      </h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {districts.map((district) => (
          <Link
            key={district.slug}
            href={`/explore/districts/${district.slug}`}
            className="flex flex-col gap-1.5 rounded-2xl border border-gray-100 bg-white px-4 py-4"
          >
            <span className="text-text-primary text-sm font-semibold">
              {district.nameZh}
            </span>
            <span className="text-xs text-gray-400">{district.nameEn}</span>
            <span className="mt-1 self-start rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
              {district.shopCount} shops
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
