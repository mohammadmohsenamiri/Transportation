"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  LngLatBounds,
  type GeoJSONSource,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ActiveMapProvider } from "@/features/map/types";
import { mapLibreScheme } from "@/lib/domain/map-provider-rules";

const LINE_SOURCE_ID = "route-draw-line";
const LINE_LAYER_ID = "route-draw-line-layer";

export interface DrawPoint {
  sequence: number;
  latitude: number;
  longitude: number;
  label?: string | null;
}

function buildTileUrls(provider: ActiveMapProvider): string[] {
  const subdomains = provider.subdomains && provider.subdomains.length > 0 ? provider.subdomains : null;
  if (!subdomains || !provider.urlTemplate.includes("{s}")) {
    return [provider.urlTemplate.replace("{s}", "a")];
  }
  return subdomains.map((subdomain) => provider.urlTemplate.replace("{s}", subdomain));
}

function toLineGeoJson(points: DrawPoint[]) {
  const sorted = [...points].sort((a, b) => a.sequence - b.sequence);
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: sorted.map((p) => [p.longitude, p.latitude]),
    },
  };
}

function markerColor(index: number, total: number): string {
  if (index === 0) return "#22c55e";
  if (index === total - 1) return "#ef4444";
  return "#2f6fed";
}

function createMarkerElement(label: string, color: string): HTMLDivElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "26px",
    height: "26px",
    borderRadius: "9999px",
    background: color,
    border: "2px solid white",
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: "11px",
    fontWeight: "700",
    fontFamily: "inherit",
    cursor: "grab",
  } satisfies Partial<CSSStyleDeclaration>);
  el.textContent = label;
  return el;
}

export interface RouteDrawMapInnerProps {
  provider: ActiveMapProvider;
  points: DrawPoint[];
  editable: boolean;
  onMapClick: (lngLat: { lat: number; lng: number }) => void;
  onPointDragEnd: (index: number, lngLat: { lat: number; lng: number }) => void;
  onCenterChange: (center: { lat: number; lng: number }) => void;
}

export function RouteDrawMapInner({
  provider,
  points,
  editable,
  onMapClick,
  onPointDragEnd,
  onCenterChange,
}: RouteDrawMapInnerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const boundsFittedRef = useRef(false);

  const onMapClickRef = useRef(onMapClick);
  const onPointDragEndRef = useRef(onPointDragEnd);
  const onCenterChangeRef = useRef(onCenterChange);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
    onPointDragEndRef.current = onPointDragEnd;
    onCenterChangeRef.current = onCenterChange;
  }, [onMapClick, onPointDragEnd, onCenterChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const tileUrls = buildTileUrls(provider);
    const scheme = mapLibreScheme(provider.kind, provider.urlTemplate);

    const map = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          base: {
            type: "raster",
            tiles: tileUrls,
            tileSize: provider.tileSize,
            scheme,
            minzoom: provider.minZoom,
            maxzoom: provider.maxZoom,
            attribution: provider.attribution ?? undefined,
          },
        },
        layers: [{ id: "base-layer", type: "raster", source: "base" }],
      },
      center: [53.688, 32.4279],
      zoom: 5,
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");

    map.on("load", () => {
      map.addSource(LINE_SOURCE_ID, { type: "geojson", data: toLineGeoJson([]) });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: LINE_SOURCE_ID,
        paint: { "line-color": "#2f6fed", "line-width": 3 },
      });
    });

    map.on("click", (event: MapMouseEvent) => {
      onMapClickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    map.on("moveend", () => {
      const center = map.getCenter();
      onCenterChangeRef.current({ lat: center.lat, lng: center.lng });
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function syncMarkers() {
      if (!map) return;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const sorted = [...points].sort((a, b) => a.sequence - b.sequence);
      sorted.forEach((point, index) => {
        const el = createMarkerElement(String(index + 1), markerColor(index, sorted.length));
        const marker = new Marker({ element: el, draggable: editable, anchor: "center" }).setLngLat([
          point.longitude,
          point.latitude,
        ]);
        if (editable) {
          marker.on("dragend", () => {
            const lngLat = marker.getLngLat();
            onPointDragEndRef.current(index, { lat: lngLat.lat, lng: lngLat.lng });
          });
        }
        marker.addTo(map);
        markersRef.current.push(marker);
      });

      const source = map.getSource(LINE_SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(toLineGeoJson(points));

      // با یک نقطه تک، fitBounds بیش‌ازحد zoom می‌کند و marker را دقیقاً وسط صفحه (محل کلیک‌های بعدی
      // کاربر) قرار می‌دهد؛ صبر می‌کنیم حداقل دو نقطه باشد تا framing معقول و پایدار باشد.
      if (!boundsFittedRef.current && points.length > 1) {
        const bounds = new LngLatBounds();
        points.forEach((p) => bounds.extend([p.longitude, p.latitude]));
        map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
        boundsFittedRef.current = true;
      }
    }

    if (map.loaded()) {
      syncMarkers();
    } else {
      map.once("load", syncMarkers);
    }
  }, [points, editable]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ cursor: editable ? "crosshair" : "default" }}
    />
  );
}
