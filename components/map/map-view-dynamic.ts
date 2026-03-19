import dynamic from 'next/dynamic';

export const MapViewDynamic = dynamic(
  () => import('@/components/map/map-view').then((m) => ({ default: m.MapView })),
  { ssr: false }
);
