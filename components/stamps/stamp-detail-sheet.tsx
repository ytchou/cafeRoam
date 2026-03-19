'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { StampData } from '@/lib/hooks/use-user-stamps';

interface StampDetailSheetProps {
  stamp: StampData;
  onClose: () => void;
}

export function StampDetailSheet({ stamp, onClose }: StampDetailSheetProps) {
  const earnedDate = formatDate(stamp.earned_at);
  const shopName = stamp.shop_name ?? 'Unknown Shop';
  const tilt = stamp.id ? ((stamp.id.charCodeAt(0) % 7) - 3) : 0;

  return (
    <Drawer open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader className="flex flex-col items-center gap-3 pb-6">
          <div
            className="w-48 bg-white p-2 shadow-lg"
            style={{ transform: `rotate(${tilt}deg)` }}
          >
            <div className="relative aspect-square overflow-hidden">
              {stamp.photo_url ? (
                <Image
                  src={stamp.photo_url}
                  alt={shopName}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              ) : (
                <Image
                  src={stamp.design_url}
                  alt={`${shopName} stamp`}
                  fill
                  className="object-contain"
                  sizes="192px"
                />
              )}
            </div>
            <div className="mt-1 px-1">
              <p className="truncate text-sm font-semibold">{shopName}</p>
              <p className="text-xs text-gray-500">
                {stamp.district && `${stamp.district} · `}{earnedDate}
              </p>
            </div>
          </div>

          <DrawerTitle className="sr-only">{shopName}</DrawerTitle>

          {stamp.diary_note && (
            <div
              data-testid="diary-note"
              className="w-full max-w-xs rounded-lg bg-amber-50 px-4 py-3"
            >
              <p className="text-center text-sm italic text-gray-700">
                &ldquo;{stamp.diary_note}&rdquo;
              </p>
            </div>
          )}

          <Link href={`/shop/${stamp.shop_id}`}>
            <Button variant="outline" size="sm">
              Visit Again &rarr;
            </Button>
          </Link>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  );
}
