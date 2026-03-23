import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/ui/coming-soon';
import { BODY_STYLE } from '@/lib/typography';

export default function NotFoundPage() {
  return (
    <ComingSoon
      title="找不到頁面"
      description="This page doesn't exist or has moved. Head back to find your next café."
      action={
        <Button
          size="lg"
          asChild
          className="rounded-full bg-brand text-white hover:bg-brand/90"
          style={BODY_STYLE}
        >
          <Link href="/">Back to home</Link>
        </Button>
      }
    />
  );
}
