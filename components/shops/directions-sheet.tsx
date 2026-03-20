'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Drawer } from 'vaul';
import { ShopMapThumbnail } from '@/components/shops/shop-map-thumbnail';
import { nearestMrtStation } from '@/lib/utils/mrt';

interface DirectionsShop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface DirectionsSheetProps {
  open: boolean;
  onClose: () => void;
  shop: DirectionsShop;
  userLat?: number;
  userLng?: number;
}

interface RouteInfo {
  durationMin: number;
  distanceM: number;
}

// 'error' sentinel: backend returned a non-2xx response (distinct from null = skipped/aborted)
type FetchResult = RouteInfo | 'error' | null;

interface RoutesState {
  loading: boolean;
  hasError: boolean;
  walkRoute: RouteInfo | null;
  driveRoute: RouteInfo | null;
  mrtWalkRoute: RouteInfo | null;
}

type RoutesAction =
  | { type: 'fetch_start' }
  | { type: 'fetch_user_routes_start' }
  | {
      type: 'fetch_done';
      walkRoute: RouteInfo | null;
      driveRoute: RouteInfo | null;
      mrtWalkRoute: RouteInfo | null;
      hasError: boolean;
    }
  | {
      type: 'fetch_user_routes_done';
      walkRoute: RouteInfo | null;
      driveRoute: RouteInfo | null;
      hasError: boolean;
    };

const initialState: RoutesState = {
  loading: false,
  hasError: false,
  walkRoute: null,
  driveRoute: null,
  mrtWalkRoute: null,
};

function routesReducer(state: RoutesState, action: RoutesAction): RoutesState {
  switch (action.type) {
    case 'fetch_start':
      return {
        loading: true,
        hasError: false,
        walkRoute: null,
        driveRoute: null,
        mrtWalkRoute: null,
      };
    case 'fetch_user_routes_start':
      // Preserve mrtWalkRoute so the MRT row doesn't flicker when location resolves
      return {
        ...state,
        loading: true,
        hasError: false,
        walkRoute: null,
        driveRoute: null,
      };
    case 'fetch_done':
      return {
        loading: false,
        hasError: action.hasError,
        walkRoute: action.walkRoute,
        driveRoute: action.driveRoute,
        mrtWalkRoute: action.mrtWalkRoute,
      };
    case 'fetch_user_routes_done':
      return {
        ...state,
        loading: false,
        hasError: action.hasError,
        walkRoute: action.walkRoute,
        driveRoute: action.driveRoute,
      };
    default:
      return state;
  }
}

async function fetchRoute(
  profile: string,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  signal: AbortSignal
): Promise<FetchResult> {
  try {
    const params = new URLSearchParams({
      origin_lat: String(fromLat),
      origin_lng: String(fromLng),
      dest_lat: String(toLat),
      dest_lng: String(toLng),
      profile,
    });
    const res = await fetch(`/api/maps/directions?${params}`, { signal });
    if (!res.ok) return 'error';
    const data = await res.json();
    return {
      durationMin: data.durationMin,
      distanceM: data.distanceM,
    };
  } catch {
    return null;
  }
}

export function DirectionsSheet({
  open,
  onClose,
  shop,
  userLat,
  userLng,
}: DirectionsSheetProps) {
  const [state, dispatch] = useReducer(routesReducer, initialState);
  const { loading, hasError, walkRoute, driveRoute, mrtWalkRoute } = state;

  // Tracks whether the sheet has already been opened (location-update vs fresh-open)
  const sheetOpenedRef = useRef(false);

  const mrtStation = useMemo(
    () => nearestMrtStation(shop.latitude, shop.longitude),
    [shop.latitude, shop.longitude]
  );

  const fetchDirections = useCallback(
    async (signal: AbortSignal, isLocationUpdate: boolean) => {
      dispatch({
        type: isLocationUpdate ? 'fetch_user_routes_start' : 'fetch_start',
      });

      const hasUserLocation = userLat !== undefined && userLng !== undefined;

      const [walkResult, driveResult, mrtWalkResult] = await Promise.all([
        hasUserLocation
          ? fetchRoute(
              'walking',
              userLat,
              userLng,
              shop.latitude,
              shop.longitude,
              signal
            )
          : Promise.resolve(null),
        hasUserLocation
          ? fetchRoute(
              'driving-traffic',
              userLat,
              userLng,
              shop.latitude,
              shop.longitude,
              signal
            )
          : Promise.resolve(null),
        // On location update the MRT route is already loaded — skip re-fetch
        isLocationUpdate
          ? Promise.resolve(null)
          : fetchRoute(
              'walking',
              mrtStation.lat,
              mrtStation.lng,
              shop.latitude,
              shop.longitude,
              signal
            ),
      ]);

      if (!signal.aborted) {
        const hasError =
          walkResult === 'error' ||
          driveResult === 'error' ||
          mrtWalkResult === 'error';
        const walk = walkResult === 'error' ? null : walkResult;
        const drive = driveResult === 'error' ? null : driveResult;
        const mrtWalk = mrtWalkResult === 'error' ? null : mrtWalkResult;

        if (isLocationUpdate) {
          dispatch({
            type: 'fetch_user_routes_done',
            walkRoute: walk,
            driveRoute: drive,
            hasError,
          });
        } else {
          dispatch({
            type: 'fetch_done',
            walkRoute: walk,
            driveRoute: drive,
            mrtWalkRoute: mrtWalk,
            hasError,
          });
        }
      }
    },
    [
      userLat,
      userLng,
      shop.longitude,
      shop.latitude,
      mrtStation.lng,
      mrtStation.lat,
    ]
  );

  useEffect(() => {
    if (!open) {
      sheetOpenedRef.current = false;
      return;
    }

    const isLocationUpdate = sheetOpenedRef.current;
    sheetOpenedRef.current = true;

    const abortController = new AbortController();
    fetchDirections(abortController.signal, isLocationUpdate);

    return () => {
      abortController.abort();
    };
  }, [open, fetchDirections]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${shop.latitude},${shop.longitude}`;

  return (
    <Drawer.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 flex max-h-[85vh] flex-col rounded-t-[10px] bg-white">
          <Drawer.Handle />
          <div className="px-4 pt-3 pb-2">
            <Drawer.Title className="text-lg font-semibold">
              Directions to {shop.name}
            </Drawer.Title>
          </div>

          <ShopMapThumbnail
            latitude={shop.latitude}
            longitude={shop.longitude}
            shopName={shop.name}
          />

          <div className="space-y-3 px-4 py-4">
            {walkRoute && (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F4F1]">
                  <WalkIcon />
                </span>
                <span>~{walkRoute.durationMin} min walk</span>
              </div>
            )}

            {driveRoute && (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F4F1]">
                  <CarIcon />
                </span>
                <span>~{driveRoute.durationMin} min drive</span>
              </div>
            )}

            {mrtStation && (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F4F1]">
                  <TrainIcon />
                </span>
                <span>
                  {mrtStation.name_en} ({mrtStation.name_zh}) &middot;{' '}
                  {mrtStation.line}
                  {mrtWalkRoute
                    ? ` · ~${mrtWalkRoute.durationMin} min walk`
                    : mrtStation.dist < 1
                      ? ` · ${Math.round(mrtStation.dist * 1000)}m`
                      : ` · ${mrtStation.dist.toFixed(1)}km`}
                </span>
              </div>
            )}

            {loading && !walkRoute && !driveRoute && (
              <p className="text-sm text-gray-400">Calculating routes...</p>
            )}

            {!loading && hasError && !walkRoute && !driveRoute && (
              <p className="text-sm text-gray-400">
                Route times unavailable. Try again later.
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t px-4 py-3">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#E5E4E1] py-2.5 text-sm font-medium text-[#2C1810]"
            >
              Google Maps
            </a>
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#E5E4E1] py-2.5 text-sm font-medium text-[#2C1810]"
            >
              Apple Maps
            </a>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function WalkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="5" r="2" />
      <path d="M10 22V18l-2-4 4-3 2 3v9" />
      <path d="M10 14l-2 2" />
      <path d="M14 14l2-2" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A1.5 1.5 0 0 0 14.1 6H9.9a1.5 1.5 0 0 0-1.2.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function TrainIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="3" width="16" height="16" rx="2" />
      <path d="M4 11h16" />
      <path d="M12 3v8" />
      <path d="m8 19-2 3" />
      <path d="m18 22-2-3" />
      <circle cx="8" cy="15" r="1" />
      <circle cx="16" cy="15" r="1" />
    </svg>
  );
}
