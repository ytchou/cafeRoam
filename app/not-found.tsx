import Link from 'next/link';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <ComingSoon
        title="找不到頁面"
        description="This page doesn't exist or has moved. Head back to find your next café."
      />
      <div className="flex justify-center pb-16">
        <Link
          href="/"
          className="h-10 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
