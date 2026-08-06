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
import type { ActiveMapProvider, MapSceneMission, OrgMapMarker } from "@/features/map/types";
import { mapLibreScheme } from "@/lib/domain/map-provider-rules";
import { levelColor, levelDisplayLabel } from "@/features/map/level-styles";
import { vehicleStatusColor } from "@/features/map/mission-marker-styles";
import type { OrganizationLevelValue } from "@/features/organization/level-labels";

const SOURCE_ID = "organization-units";
const CLUSTER_LAYER_ID = "organization-clusters";
const CLUSTER_RING_LAYER_ID = "organization-cluster-rings";
const POINT_LAYER_ID = "organization-points";
const ROUTE_LINE_SOURCE_ID = "selected-mission-route";
const ROUTE_LINE_LAYER_ID = "selected-mission-route-line";

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

function emptyLineString() {
  return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [] as [number, number][] } };
}

const VEHICLE_MARKER_SVG_NS = "http://www.w3.org/2000/svg";

function buildVehicleMarkerSvg(size: number): SVGSVGElement {
  const svg = document.createElementNS(VEHICLE_MARKER_SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");

  const circle = document.createElementNS(VEHICLE_MARKER_SVG_NS, "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12");
  circle.setAttribute("r", "10");
  circle.setAttribute("stroke", "white");
  circle.setAttribute("stroke-width", "2");
  circle.dataset.role = "vehicle-marker-circle";

  // فلش سفید داخل دایره رنگی؛ چرخش آن بر اساس bearing اعمال می‌شود (۰ درجه = شمال = بالا)
  const path = document.createElementNS(VEHICLE_MARKER_SVG_NS, "path");
  path.setAttribute("d", "M12 5 L16 15 L12 12.2 L8 15 Z");
  path.setAttribute("fill", "white");

  svg.appendChild(circle);
  svg.appendChild(path);
  return svg;
}

/**
 * برخلاف نسخه اولیه که با هر refresh دوره‌ای صحنه نقشه (هر ۵ ثانیه) کل innerHTML را بازسازی
 * می‌کرد، این نسخه فقط attributeهایی را که واقعاً تغییر کرده‌اند به‌روزرسانی می‌کند — گره‌های SVG
 * هرگز جایگزین نمی‌شوند. این هم از ناپایداری DOM هنگام کلیک کاربر/تست جلوگیری می‌کند و هم رفتار
 * صحیح‌تری برای مأموریتی است که موقعیتش واقعاً عوض نشده (مثلاً هنوز WAITING است).
 */
function applyVehicleMarkerVisual(el: HTMLDivElement, vehicle: MapSceneMission, selected: boolean): void {
  const size = selected ? 30 : 24;
  const color = vehicleStatusColor[vehicle.status] ?? "#64748b";
  const rotation = vehicle.bearingDegrees ?? 0;

  el.dataset.missionId = vehicle.missionId;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.cursor = "pointer";
  el.style.filter = selected ? "drop-shadow(0 0 5px rgba(47,111,237,0.85))" : "";

  let svg = el.querySelector("svg");
  if (!svg) {
    svg = buildVehicleMarkerSvg(size);
    el.appendChild(svg);
  }
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.style.transform = `rotate(${rotation}deg)`;
  svg.querySelector('[data-role="vehicle-marker-circle"]')?.setAttribute("fill", color);
}

function createVehicleMarkerElement(vehicle: MapSceneMission, selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  applyVehicleMarkerVisual(el, vehicle, selected);
  return el;
}

function createFlagMarkerElement(color: string): HTMLDivElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "24px",
    height: "24px",
    borderRadius: "9999px 9999px 9999px 0",
    transform: "rotate(45deg)",
    background: color,
    border: "2px solid white",
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
  } satisfies Partial<CSSStyleDeclaration>);
  return el;
}

export type MapInteractionMode = "view" | "select-origin" | "select-destination";

export interface SelectedRoutePreview {
  points: readonly { latitude: number; longitude: number }[];
  isFallbackDirect: boolean;
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
}

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
  /** خودروهای مأموریت‌دار برای رسم روی نقشه (Phase 10) — از GET /api/v1/map/scene. */
  vehicles?: MapSceneMission[];
  /** مأموریت انتخاب‌شده جاری؛ marker متناظر halo می‌گیرد. */
  selectedMissionId?: string | null;
  /** Tap روی یک vehicle marker. */
  onVehicleSelect?: (missionId: string) => void;
  /** مسیر/خط مستقیم و مبدأ/مقصد مأموریت انتخاب‌شده برای highlight — فقط برای مأموریت انتخاب‌شده rendered می‌شود. */
  selectedRoutePreview?: SelectedRoutePreview | null;
  /** دکمه «فیلتر بر اساس این به‌عنوان مبدأ» داخل popup مربوط به marker انبار (Phase 11، context menu مبدأ/مقصد). */
  onFilterByOrigin?: (marker: OrgMapMarker) => void;
  /** دکمه «فیلتر بر اساس این به‌عنوان مقصد» داخل popup هر marker سازمانی (Phase 11). */
  onFilterByDestination?: (marker: OrgMapMarker) => void;
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
  vehicles = [],
  selectedMissionId = null,
  onVehicleSelect,
  selectedRoutePreview = null,
  onFilterByOrigin,
  onFilterByDestination,
}: MapLibreMapInnerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const pinMarkerRef = useRef<Marker | null>(null);
  const markersRef = useRef<OrgMapMarker[]>(markers);
  const vehicleMarkersRef = useRef<Map<string, Marker>>(new Map());
  const originHighlightMarkerRef = useRef<Marker | null>(null);
  const destinationHighlightMarkerRef = useRef<Marker | null>(null);
  const onTileErrorRef = useRef(onTileError);
  const interactionModeRef = useRef(interactionMode);
  const onMarkerSelectRef = useRef(onMarkerSelect);
  const onMapPickRef = useRef(onMapPick);
  const onVehicleSelectRef = useRef(onVehicleSelect);
  const onFilterByOriginRef = useRef(onFilterByOrigin);
  const onFilterByDestinationRef = useRef(onFilterByDestination);
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
  useEffect(() => {
    onVehicleSelectRef.current = onVehicleSelect;
  }, [onVehicleSelect]);
  useEffect(() => {
    onFilterByOriginRef.current = onFilterByOrigin;
  }, [onFilterByOrigin]);
  useEffect(() => {
    onFilterByDestinationRef.current = onFilterByDestination;
  }, [onFilterByDestination]);

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

      map.addSource(ROUTE_LINE_SOURCE_ID, { type: "geojson", data: emptyLineString() });
      map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: "line",
        source: ROUTE_LINE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#2f6fed", "line-width": 4, "line-opacity": 0.85 },
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
        const marker = markersRef.current.find((m) => m.id === props.id);

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

        // دکمه‌های «فیلتر بر اساس این به‌عنوان مبدأ/مقصد» (Phase 11) — با createElement/textContent
        // ساخته می‌شوند نه innerHTML، تا event listener واقعی attach شود، نه رشته HTML.
        if (marker && (onFilterByOriginRef.current || onFilterByDestinationRef.current)) {
          const actions = document.createElement("div");
          actions.style.marginTop = "8px";
          actions.style.display = "flex";
          actions.style.gap = "6px";
          actions.style.flexWrap = "wrap";

          function addActionButton(label: string, onClick: () => void) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            Object.assign(button.style, {
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "transparent",
              cursor: "pointer",
              color: "#111827",
            } satisfies Partial<CSSStyleDeclaration>);
            button.addEventListener("click", () => {
              onClick();
              popupRef.current?.remove();
            });
            actions.appendChild(button);
          }

          if (props.level === "WAREHOUSE" && onFilterByOriginRef.current) {
            addActionButton("فیلتر مبدأ از این نقطه", () => onFilterByOriginRef.current?.(marker));
          }
          if (onFilterByDestinationRef.current) {
            addActionButton("فیلتر مقصد از این نقطه", () => onFilterByDestinationRef.current?.(marker));
          }
          content.appendChild(actions);
        }

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
      // عمداً آخرین مقدار ref را در لحظه unmount می‌خوانیم (نه مقدار زمان mount)، چون marker خودروها
      // توسط افکت جداگانه sync می‌شوند؛ خود شیء Map هرگز بازساخته نمی‌شود، فقط محتوایش تغییر می‌کند.
      /* eslint-disable react-hooks/exhaustive-deps */
      vehicleMarkersRef.current.forEach((marker) => marker.remove());
      vehicleMarkersRef.current.clear();
      /* eslint-enable react-hooks/exhaustive-deps */
      originHighlightMarkerRef.current?.remove();
      destinationHighlightMarkerRef.current?.remove();
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

  // همگام‌سازی marker خودروها (Phase 10) — یک DOM Marker به‌ازای هر خودرو، رنگ بر اساس وضعیت و
  // چرخش بر اساس bearing؛ marker انتخاب‌شده بزرگ‌تر و halo دارد.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function sync() {
      if (!map) return;
      const seen = new Set<string>();
      for (const vehicle of vehicles) {
        seen.add(vehicle.missionId);
        const selected = vehicle.missionId === selectedMissionId;
        const existing = vehicleMarkersRef.current.get(vehicle.missionId);

        if (existing) {
          // به‌روزرسانی موقعیت/ظاهر marker موجود به‌جای حذف و بازساخت — یک DOM node پایدار برای
          // هر مأموریت در سراسر چرخه‌های refresh دوره‌ای (هر ۵ ثانیه) حفظ می‌شود.
          existing.setLngLat([vehicle.position.longitude, vehicle.position.latitude]);
          applyVehicleMarkerVisual(existing.getElement() as HTMLDivElement, vehicle, selected);
          continue;
        }

        const el = createVehicleMarkerElement(vehicle, selected);
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          onVehicleSelectRef.current?.(vehicle.missionId);
        });

        const marker = new Marker({ element: el, anchor: "center" })
          .setLngLat([vehicle.position.longitude, vehicle.position.latitude])
          .addTo(map);
        vehicleMarkersRef.current.set(vehicle.missionId, marker);
      }

      for (const [missionId, marker] of vehicleMarkersRef.current) {
        if (!seen.has(missionId)) {
          marker.remove();
          vehicleMarkersRef.current.delete(missionId);
        }
      }
    }

    if (map.loaded()) sync();
    else map.once("load", sync);
  }, [vehicles, selectedMissionId]);

  // رسم مسیر/خط مستقیم و highlight مبدأ/مقصد فقط برای مأموریت انتخاب‌شده (UX_MAP_AND_DESIGN_SYSTEM.md §6)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function sync() {
      if (!map) return;
      const source = map.getSource(ROUTE_LINE_SOURCE_ID) as GeoJSONSource | undefined;

      originHighlightMarkerRef.current?.remove();
      originHighlightMarkerRef.current = null;
      destinationHighlightMarkerRef.current?.remove();
      destinationHighlightMarkerRef.current = null;

      if (!selectedRoutePreview) {
        source?.setData(emptyLineString());
        return;
      }

      source?.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: selectedRoutePreview.points.map((p) => [p.longitude, p.latitude]),
        },
      });
      if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
        map.setPaintProperty(ROUTE_LINE_LAYER_ID, "line-dasharray", selectedRoutePreview.isFallbackDirect ? [2, 2] : [1, 0]);
      }

      originHighlightMarkerRef.current = new Marker({ element: createFlagMarkerElement("#16a34a"), anchor: "bottom" })
        .setLngLat([selectedRoutePreview.origin.longitude, selectedRoutePreview.origin.latitude])
        .addTo(map);
      destinationHighlightMarkerRef.current = new Marker({ element: createFlagMarkerElement("#ef4444"), anchor: "bottom" })
        .setLngLat([selectedRoutePreview.destination.longitude, selectedRoutePreview.destination.latitude])
        .addTo(map);
    }

    if (map.loaded()) sync();
    else map.once("load", sync);
  }, [selectedRoutePreview]);

  return <div ref={containerRef} className="h-full w-full" />;
}
