'use client';
import { useMemo, useRef, useCallback, useEffect } from 'react';
import Map, { Layer, Source } from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import type { GeoJSONSource } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { MapBounds } from '@/lib/utils/filter-by-bounds';

export type { MapBounds };

interface Shop {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface MapViewProps {
  shops: Shop[];
  onPinClick: (shopId: string) => void;
  selectedShopId: string | null;
  mapStyle?: string;
  onBoundsChange?: (bounds: MapBounds) => void;
}

type ShopFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: string; name: string };
  }>;
};

const SOURCE_ID = 'shops-source';
const LAYER_CLUSTERS = 'shops-clusters';
const LAYER_CLUSTER_COUNT = 'shops-cluster-count';
const LAYER_PINS = 'shops-pins';

const CLUSTER_MAX_ZOOM = 14;
const FLY_TO_ZOOM = CLUSTER_MAX_ZOOM + 1;

// DESIGN.md: Map Brown #8b5e3c (pin fill), Terracotta #E06B3F (active state)
const COLOR_PIN = '#8b5e3c';
const COLOR_PIN_SELECTED = '#E06B3F';
const COLOR_CLUSTER = '#8b5e3c';
const COLOR_LABEL = '#ffffff';

export function MapView({
  shops,
  onPinClick,
  selectedShopId,
  mapStyle = 'mapbox://styles/mapbox/light-v11',
  onBoundsChange,
}: MapViewProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef>(null);

  const geojsonData = useMemo(
    (): ShopFeatureCollection => ({
      type: 'FeatureCollection',
      features: shops
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.longitude!, s.latitude!] },
          properties: { id: s.id, name: s.name },
        })),
    }),
    [shops]
  );

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      // Cluster click → zoom to expand
      const clusterFeatures = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_CLUSTERS],
      });
      if (clusterFeatures.length) {
        const feature = clusterFeatures[0];
        const clusterId = feature.properties?.cluster_id as number | undefined;
        if (clusterId == null) return;
        const coords = (
          feature.geometry as { type: string; coordinates: [number, number] }
        ).coordinates;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({ center: coords, zoom });
        });
        return;
      }

      // Individual pin click → open shop card
      const pinFeatures = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_PINS],
      });
      if (pinFeatures.length) {
        const shopId = String(pinFeatures[0].properties?.id ?? '');
        if (shopId) onPinClick(shopId);
      }
    },
    [onPinClick]
  );

  useEffect(() => {
    if (!selectedShopId) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const shop = shops.find((s) => s.id === selectedShopId);
    if (!shop || shop.latitude == null || shop.longitude == null) return;

    const center: [number, number] = [shop.longitude, shop.latitude];
    const currentZoom = map.getZoom();
    const zoom = currentZoom <= CLUSTER_MAX_ZOOM ? FLY_TO_ZOOM : currentZoom;

    map.flyTo({ center, zoom, duration: 800 });
  }, [selectedShopId, shops]);

  const reportBounds = useCallback(() => {
    if (!onBoundsChange) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    onBoundsChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [onBoundsChange]);

  const handleLoad = useCallback(() => {
    reportBounds();
  }, [reportBounds]);

  if (!mapboxToken) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        地圖無法載入：缺少 Mapbox token
      </div>
    );
  }

  // NOTE: GL layers do not support per-pin aria-label or keyboard focus.
  // Keyboard users should use the list-view toggle to navigate shops.
  // TODO(a11y): Add a visually-hidden <ul> overlay for screen readers.
  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      initialViewState={{ longitude: 121.5654, latitude: 25.033, zoom: 13 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      onClick={handleClick}
      onLoad={handleLoad}
      onMoveEnd={reportBounds}
      interactiveLayerIds={[LAYER_CLUSTERS, LAYER_PINS]}
    >
      <Source
        id={SOURCE_ID}
        type="geojson"
        data={geojsonData}
        cluster={true}
        clusterMaxZoom={CLUSTER_MAX_ZOOM}
        clusterRadius={50}
      >
        {/* Cluster bubble — sized by shop count */}
        <Layer
          id={LAYER_CLUSTERS}
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': COLOR_CLUSTER,
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              10,
              26,
              50,
              32,
            ],
            'circle-opacity': 0.9,
          }}
        />
        {/* Count label inside cluster */}
        <Layer
          id={LAYER_CLUSTER_COUNT}
          type="symbol"
          filter={['has', 'point_count']}
          layout={{
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 13,
          }}
          paint={{ 'text-color': COLOR_LABEL }}
        />
        {/* Individual unclustered pin — selected state via paint expression */}
        <Layer
          id={LAYER_PINS}
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{
            // GL expressions cannot contain null; '' is safe here because no shop
            // has an empty-string id — do not change to null/undefined.
            'circle-color': [
              'case',
              ['==', ['get', 'id'], selectedShopId ?? ''],
              COLOR_PIN_SELECTED,
              COLOR_PIN,
            ],
            'circle-radius': [
              'case',
              ['==', ['get', 'id'], selectedShopId ?? ''],
              10,
              8,
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          }}
        />
      </Source>
    </Map>
  );
}
