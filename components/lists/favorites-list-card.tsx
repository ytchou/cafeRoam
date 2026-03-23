'use client';
import Image from 'next/image';
import { MoreHorizontal, Coffee } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface FavoritesListCardProps {
  id: string;
  name: string;
  itemCount: number;
  photoUrls: string[];
  onRename: () => void;
  onDelete: () => void;
  onViewOnMap: () => void;
}

const MAX_THUMBNAILS = 4;

export function FavoritesListCard({
  name,
  itemCount,
  photoUrls,
  onRename,
  onDelete,
  onViewOnMap,
}: FavoritesListCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const visiblePhotos = photoUrls.slice(0, MAX_THUMBNAILS);
  const overflow = photoUrls.length - MAX_THUMBNAILS;

  return (
    <div className="rounded-[20px] bg-white p-4 shadow-[0_2px_12px_#0000000A] ring-1 ring-[#F3F4F6]">
      {/* Top row: name + count + options */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-body)] text-base font-bold text-[var(--foreground)]">
            {name}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {itemCount} {itemCount === 1 ? 'shop' : 'shops'}
          </span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDECEA]"
            aria-label="List options"
          >
            <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          {menuOpen && (
            <div className="absolute top-10 right-0 z-10 rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5">
              <button
                onClick={() => {
                  onRename();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--muted)]"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-[var(--muted)]"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo thumbnails row */}
      <div className="mt-3 flex gap-2">
        {visiblePhotos.length > 0
          ? visiblePhotos.map((url, i) => (
              <div
                key={i}
                className="relative h-[60px] w-20 shrink-0 overflow-hidden rounded-xl"
              >
                <Image
                  src={url}
                  alt={`${name} photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            ))
          : Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex h-[60px] w-20 shrink-0 items-center justify-center rounded-xl bg-[#EDECEA]"
              >
                <Coffee className="h-5 w-5 text-[var(--text-tertiary)]" />
              </div>
            ))}
        {overflow > 0 && (
          <div className="flex h-[60px] flex-1 items-center justify-center rounded-xl bg-[#EDECEA] text-xs font-medium text-[var(--text-secondary)]">
            +{overflow}
          </div>
        )}
      </div>

      {/* Bottom row: updated + view on map */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#3D8A5A]" />
          <span className="text-xs text-[var(--text-secondary)]">
            Updated recently
          </span>
        </div>
        <button
          onClick={onViewOnMap}
          className="text-xs font-medium text-[#3D8A5A]"
        >
          View on map →
        </button>
      </div>
    </div>
  );
}
