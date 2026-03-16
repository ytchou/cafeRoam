import Image from 'next/image';

interface ShopHeroProps {
  photoUrls: string[];
  shopName: string;
}

export function ShopHero({ photoUrls, shopName }: ShopHeroProps) {
  const primary = photoUrls[0];
  return (
    <div className="relative aspect-video w-full bg-gray-100 md:aspect-auto md:h-64">
      {primary ? (
        <Image
          src={primary}
          alt={shopName}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-4xl font-bold text-gray-300">
          {shopName[0]}
        </div>
      )}
    </div>
  );
}
