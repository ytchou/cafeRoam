'use client';
import { useMemo, useRef, useCallback } from 'react';
import Map, { Layer, Source } from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import type { GeoJSONSource } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
}: MapViewProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef>(null);

  const geojsonData = useMemo((): ShopFeatureCollection => ({
    type: 'FeatureCollection',
    features: shops
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.longitude!, s.latitude!] },
        properties: { id: s.id, name: s.name },
      })),
  }), [shops]);

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
        const clusterId = feature.properties?.cluster_id as number;
        const coords = (feature.geometry as { type: string; coordinates: [number, number] }).coordinates;
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
        const shopId = pinFeatures[0].properties?.id as string;
        if (shopId) onPinClick(shopId);
      }
    },
    [onPinClick]
  );

  if (!mapboxToken) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        地圖無法載入：缺少 Mapbox token
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      initialViewState={{ longitude: 121.5654, latitude: 25.033, zoom: 13 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      onClick={handleClick}
      interactiveLayerIds={[LAYER_CLUSTERS, LAYER_PINS]}
    >
      <Source
        id={SOURCE_ID}
        type="geojson"
        data={geojsonData}
        cluster={true}
        clusterMaxZoom={14}
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
              10, 26,
              50, 32,
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
