"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  LngLatBounds,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type MapMouseEvent,
  type ErrorEvent as MapLibreErrorEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ActiveMapProvider, OrgMapMarker } from "@/features/map/types";
import { mapLibreScheme } from "@/lib/domain/map-provider-rules";
import { levelColor, levelDisplayLabel } from "@/features/map/level-styles";
import type { OrganizationLevelValue } from "@/features/organization/level-labels";

const SOURCE_ID = "organization-units";
const CLUSTER_LAYER_ID = "organization-clusters";
const CLUSTER_RING_LAYER_ID = "organization-cluster-rings";
const POINT_LAYER_ID = "organization-points";

function buildTileUrls(provider: ActiveMapProvider): string[] {
  const subdomains = provider.subdomains && provider.subdomains.length > 0 ? provider.subdomains : null;
  if (!subdomains || !provider.urlTemplate.includes("{s}")) {
    return [provider.urlTemplate.replace("{s}", "a")];
  }
  return subdomains.map((subdomain) => provider.urlTemplate.replace("{s}", subdomain));
}

function toFeatureCollection(markers: OrgMapMarker[], visibleLevels: Set<OrganizationLevelValue>) {
  return {
    type: "FeatureCollection" as const,
    features: markers
      .filter((marker) => visibleLevels.has(marker.level))
      .map((marker) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [marker.longitude, marker.latitude] },
        properties: {
          id: marker.id,
          code: marker.code,
          name: marker.name,
          level: marker.level,
        },
      })),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type MapInteractionMode = "view" | "select-origin" | "select-destination";

export interface MapLibreMapInnerProps {
  provider: ActiveMapProvider;
  markers: OrgMapMarker[];
  visibleLevels: Set<OrganizationLevelValue>;
  onTileError: () => void;
  /** حالت انتخاب مبدأ/مقصد برای ساخت مأموریت از داخل نقشه (Phase 8)؛ پیش‌فرض "view" یعنی رفتار قبلی بدون تغییر. */
  interactionMode?: MapInteractionMode;
  /** Tap روی یک marker در حالت انتخاب — تصمیم قبول/رد بر اساس سطح (مثلاً فقط WAREHOUSE در مبدأ) به مصرف‌کننده واگذار می‌شود. */
  onMarkerSelect?: (marker: OrgMapMarker) => void;
  /** Tap روی نقطه خالی نقشه در حالت select-destination. */
  onMapPick?: (lngLat: { lat: number; lng: number }) => void;
  /** نقطه مقصد موقتاً انتخاب‌شده (Tap آزاد) — با یک marker موقت نمایش داده می‌شود. */
  pinPoint?: { latitude: number; longitude: number } | null;
}

export function MapLibreMapInner({
  provider,
  markers,
  visibleLevels,
  onTileError,
  interactionMode = "view",
  onMarkerSelect,
  onMapPick,
  pinPoint = null,
}: MapLibreMapInnerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const pinMarkerRef = useRef<Marker | null>(null);
  const markersRef = useRef<OrgMapMarker[]>(markers);
  const onTileErrorRef = useRef(onTileError);
  const interactionModeRef = useRef(interactionMode);
  const onMarkerSelectRef = useRef(onMarkerSelect);
  const onMapPickRef = useRef(onMapPick);
  useEffect(() => {
    onTileErrorRef.current = onTileError;
  }, [onTileError]);
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);
  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);
  useEffect(() => {
    onMarkerSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);
  useEffect(() => {
    onMapPickRef.current = onMapPick;
  }, [onMapPick]);

  // ساخت اولیه نقشه — فقط یک‌بار در mount اجرا می‌شود؛ تغییر provider نیاز به remount کامل دارد
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
      zoom: 4,
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");

    map.on("error", (event: MapLibreErrorEvent) => {
      // خطای تکی کاشی نباید کل shell را از کار بیندازد؛ فقط به والد اطلاع می‌دهیم
      console.warn("خطای MapLibre:", event.error);
      onTileErrorRef.current();
    });

    // Tap روی نقطه خالی نقشه — قبل از "load" هم ثبت می‌شود (نه داخل آن) تا کلیک زودهنگام کاربر
    // (پیش از آماده‌شدن کامل style/لایه‌ها) گم نشود؛ queryRenderedFeatures پیش از افزودن لایه‌ها
    // به‌سادگی آرایه خالی برمی‌گرداند.
    map.on("click", (event: MapMouseEvent) => {
      if (interactionModeRef.current !== "select-destination") return;
      const hits = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID, POINT_LAYER_ID] });
      if (hits.length > 0) return; // کلیک روی marker/cluster از handlerهای اختصاصی لایه مدیریت می‌شود
      onMapPickRef.current?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection(markers, visibleLevels),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });

      map.addLayer({
        id: CLUSTER_RING_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26],
          "circle-color": "#2f6fed",
          "circle-opacity": 0.18,
        },
      });

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 10, 10, 13, 50, 17],
          "circle-color": "#2f6fed",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 8,
          "circle-color": [
            "match",
            ["get", "level"],
            "COUNTRY_OFFICE",
            levelColor.COUNTRY_OFFICE,
            "GROUP_OFFICE",
            levelColor.GROUP_OFFICE,
            "DISTRIBUTOR_OFFICE",
            levelColor.DISTRIBUTOR_OFFICE,
            "WAREHOUSE",
            levelColor.WAREHOUSE,
            "#64748b",
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      if (markers.length > 0) {
        const bounds = new LngLatBounds();
        markers.forEach((marker) => bounds.extend([marker.longitude, marker.latitude]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
      }

      map.on("click", CLUSTER_LAYER_ID, (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geometry = feature.geometry;
          if (geometry.type !== "Point") return;
          map.easeTo({ center: geometry.coordinates as [number, number], zoom });
        });
      });

      map.on("click", POINT_LAYER_ID, (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const props = feature.properties as { id: string; name: string; code: string; level: OrganizationLevelValue };

        if (interactionModeRef.current !== "view") {
          const marker = markersRef.current.find((m) => m.id === props.id);
          if (marker) onMarkerSelectRef.current?.(marker);
          return;
        }

        const coordinates = feature.geometry.coordinates.slice() as [number, number];

        const content = document.createElement("div");
        content.style.direction = "rtl";
        content.style.fontFamily = "inherit";
        content.style.fontSize = "13px";
        content.style.lineHeight = "1.7";
        content.innerHTML = `
          <div style="font-weight:600;margin-bottom:2px;">${escapeHtml(props.name)}</div>
          <div style="color:#6b7280;">${escapeHtml(levelDisplayLabel[props.level])}</div>
          <div style="color:#9ca3af;font-size:11px;direction:ltr;text-align:right;margin-top:4px;">${escapeHtml(props.code)}</div>
        `;

        popupRef.current?.remove();
        popupRef.current = new Popup({ closeOnClick: true, maxWidth: "240px" })
          .setLngLat(coordinates)
          .setDOMContent(content)
          .addTo(map);
      });

      [CLUSTER_LAYER_ID, POINT_LAYER_ID].forEach((layerId) => {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = interactionModeRef.current !== "view" ? "crosshair" : "";
        });
      });
    });

    return () => {
      popupRef.current?.remove();
      pinMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.id]);

  // به‌روزرسانی داده هنگام تغییر فیلتر سطح — فقط setData، نه بازسازی کل نقشه
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(toFeatureCollection(markers, visibleLevels));
    }
  }, [markers, visibleLevels]);

  // در حالت انتخاب مبدأ، فقط marker انبار قابل انتخاب است؛ بقیه سطوح کم‌رنگ می‌شوند تا گمراه‌کننده نباشند
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(POINT_LAYER_ID)) return;
    const opacity =
      interactionMode === "select-origin"
        ? (["case", ["==", ["get", "level"], "WAREHOUSE"], 1, 0.25] as unknown as number)
        : 1;
    map.setPaintProperty(POINT_LAYER_ID, "circle-opacity", opacity);
    map.getCanvas().style.cursor = interactionMode !== "view" ? "crosshair" : "";
  }, [interactionMode]);

  // نمایش/به‌روزرسانی marker موقت مقصد آزاد (Tap روی نقطه خالی نقشه در حالت select-destination)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function sync() {
      if (!map) return;
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = null;
      if (!pinPoint) return;
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "22px",
        height: "22px",
        borderRadius: "9999px 9999px 9999px 0",
        transform: "rotate(45deg)",
        background: "#ef4444",
        border: "2px solid white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
      } satisfies Partial<CSSStyleDeclaration>);
      pinMarkerRef.current = new Marker({ element: el, anchor: "bottom" }).setLngLat([pinPoint.longitude, pinPoint.latitude]).addTo(map);
    }

    if (map.loaded()) sync();
    else map.once("load", sync);
  }, [pinPoint]);

  return <div ref={containerRef} className="h-full w-full" />;
}
