"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Map } from "lucide-react";
import { MapView } from "@/components/map/map-view";

interface Shop {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface CollapsibleMapPanelProps {
  shops: Shop[];
  selectedShopId: string | null;
  onPinClick: (shopId: string) => void;
}

export function CollapsibleMapPanel({
  shops,
  selectedShopId,
  onPinClick,
}: CollapsibleMapPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-4">
      <div
        data-testid="map-container"
        data-collapsed={collapsed}
        className={`overflow-hidden rounded-xl transition-all duration-300 ${
          collapsed ? "h-0" : "h-[250px]"
        }`}
      >
        <MapView
          shops={shops}
          selectedShopId={selectedShopId}
          onPinClick={onPinClick}
        />
      </div>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="mx-auto mt-2 flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-gray-500 shadow-sm hover:bg-gray-50"
      >
        {collapsed ? (
          <>
            <Map className="h-3 w-3" />
            顯示地圖
            <ChevronDown className="h-3 w-3" />
          </>
        ) : (
          <>
            收起地圖
            <ChevronUp className="h-3 w-3" />
          </>
        )}
      </button>
    </div>
  );
}
