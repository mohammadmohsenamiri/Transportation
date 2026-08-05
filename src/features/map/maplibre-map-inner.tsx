"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  LngLatBounds,
  type GeoJSONSource,
  type MapLayerMouseEvent,
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

export interface MapLibreMapInnerProps {
  provider: ActiveMapProvider;
  markers: OrgMapMarker[];
  visibleLevels: Set<OrganizationLevelValue>;
  onTileError: () => void;
}

export function MapLibreMapInner({ provider, markers, visibleLevels, onTileError }: MapLibreMapInnerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const onTileErrorRef = useRef(onTileError);
  useEffect(() => {
    onTileErrorRef.current = onTileError;
  }, [onTileError]);

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
        const props = feature.properties as { name: string; code: string; level: OrganizationLevelValue };
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
          map.getCanvas().style.cursor = "";
        });
      });
    });

    return () => {
      popupRef.current?.remove();
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

  return <div ref={containerRef} className="h-full w-full" />;
}
