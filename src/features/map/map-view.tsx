"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Icon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { useActiveMapProvider, useMapScene, useOrgUnitsForMap } from "@/features/map/use-map-queries";
import { useRouteDetail } from "@/features/routes/use-route-queries";
import { levelColor, levelDisplayLabel, levelOrder } from "@/features/map/level-styles";
import type { OrganizationLevelValue } from "@/features/organization/level-labels";
import type { OrgMapMarker } from "@/features/map/types";
import type { MapInteractionMode, SelectedRoutePreview } from "@/features/map/maplibre-map-inner";
import { MissionMapCreatePanel, type MissionMapDestination } from "@/features/missions/mission-map-create-panel";
import { MissionDetailPanel } from "@/features/map/mission-detail-panel";
import { useMissionInteraction } from "@/features/map/use-mission-interaction";
import { OperationalMissionTable } from "@/features/map/operational-mission-table";
import { ActiveFilterChips, MissionFilterForm, isFilterPanelActive } from "@/features/map/mission-filter-panel";
import { useTimelineEngine } from "@/features/map/use-timeline-engine";
import { TimelineSeeker } from "@/features/map/timeline-seeker";

const MapLibreMapInner = dynamic(
  () => import("@/features/map/maplibre-map-inner").then((mod) => mod.MapLibreMapInner),
  { ssr: false, loading: () => <MapLoadingState /> },
);

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-muted)]">
      در حال بارگذاری نقشه...
    </div>
  );
}

function DegradedState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon name="alert" className="h-8 w-8 text-[var(--color-warning)]" />
      <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
      <p className="max-w-sm text-xs text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

type PickStage = "origin" | "destination" | "details";

export interface MapViewProps {
  canCreateMission?: boolean;
}

export function MapView({ canCreateMission = false }: MapViewProps) {
  const router = useRouter();
  const providerQuery = useActiveMapProvider();
  const markersQuery = useOrgUnitsForMap();
  // موتور زمان‌بندی فاز ۱۲ باید پیش از useMapScene فراخوانی شود چون viewTimeParam آن ورودی همان
  // query است — طبق docs/phase-12-timeline-engine/00-README.md §9.1، این hook یک سطح بالاتر از
  // useMissionInteraction فاز ۱۱ در جریان داده این صفحه قرار می‌گیرد.
  const timeline = useTimelineEngine();
  const sceneQuery = useMapScene(timeline.viewTimeParam);
  const [visibleLevels, setVisibleLevels] = useState<Set<OrganizationLevelValue>>(
    () => new Set(levelOrder),
  );
  const [tileDegraded, setTileDegraded] = useState(false);

  const allMissions = useMemo(() => sceneQuery.data?.missions ?? [], [sceneQuery.data]);
  const interaction = useMissionInteraction(allMissions);
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileTableOpen, setMobileTableOpen] = useState(false);
  const availableVehicleTypes = useMemo(
    () => [...new Set(allMissions.map((m) => m.vehicleTypeName))].sort((a, b) => a.localeCompare(b, "fa-IR")),
    [allMissions],
  );

  const [missionMode, setMissionMode] = useState(false);
  const [pickStage, setPickStage] = useState<PickStage>("origin");
  const [originMarker, setOriginMarker] = useState<OrgMapMarker | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<MissionMapDestination | null>(null);
  const [originSearch, setOriginSearch] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const markers = useMemo(() => markersQuery.data ?? [], [markersQuery.data]);
  const countByLevel = useMemo(() => {
    const counts: Record<OrganizationLevelValue, number> = {
      COUNTRY_OFFICE: 0,
      GROUP_OFFICE: 0,
      DISTRIBUTOR_OFFICE: 0,
      WAREHOUSE: 0,
    };
    for (const marker of markers) counts[marker.level] += 1;
    return counts;
  }, [markers]);

  const warehouseMatches = useMemo(() => {
    const warehouses = markers.filter((m) => m.level === "WAREHOUSE");
    if (!originSearch.trim()) return warehouses;
    const q = originSearch.trim().toLowerCase();
    return warehouses.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
  }, [markers, originSearch]);

  // خودروهای فاز ۱۰/۱۱ فقط در حالت عادی نقشه نمایش داده می‌شوند؛ در حین ساخت مأموریت از نقشه (فاز ۸)
  // برای جلوگیری از شلوغی/تداخل کلیک با marker انبار پنهان می‌شوند. مجموعه نمایش‌داده‌شده روی نقشه
  // دقیقاً همان مجموعه فیلترشده جدول است (فاز ۱۱) — فیلترهای «نمای نقشه» طبق docs/PROJECT_SPEC.md
  // §9 هم روی جدول و هم روی marker‌های نقشه اثر می‌گذارند، نه فقط روی جدول.
  const vehicles = useMemo(() => (missionMode ? [] : interaction.visibleMissions), [missionMode, interaction.visibleMissions]);
  const selectedMissionId = interaction.selectedMissionId;
  const selectedMission = useMemo(() => vehicles.find((v) => v.missionId === selectedMissionId) ?? null, [vehicles, selectedMissionId]);
  const selectedRouteDetailQuery = useRouteDetail(selectedMission?.routeId ?? undefined);

  const selectedRoutePreview = useMemo<SelectedRoutePreview | null>(() => {
    if (!selectedMission) return null;
    const origin = { latitude: selectedMission.originLatitude, longitude: selectedMission.originLongitude };
    const destination = { latitude: selectedMission.destinationLatitude, longitude: selectedMission.destinationLongitude };

    if (selectedMission.routeId && selectedRouteDetailQuery.data) {
      const sorted = [...selectedRouteDetailQuery.data.points].sort((a, b) => a.sequence - b.sequence);
      return { points: sorted.map((p) => ({ latitude: p.latitude, longitude: p.longitude })), isFallbackDirect: false, origin, destination };
    }
    // مسیر واقعی هنوز lazy-load نشده یا مأموریت اصلاً مسیر ندارد — تا بارگذاری، خط مستقیم fallback نمایش داده می‌شود
    return { points: [origin, destination], isFallbackDirect: selectedMission.isFallbackDirect || !selectedMission.routeId, origin, destination };
  }, [selectedMission, selectedRouteDetailQuery.data]);

  function toggleLevel(level: OrganizationLevelValue) {
    setVisibleLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function startMissionMode() {
    setMissionMode(true);
    setPickStage("origin");
    setOriginMarker(null);
    setDestinationPoint(null);
    setOriginSearch("");
    setManualLat("");
    setManualLng("");
    interaction.select(null);
    // طبق تصمیم ثبت‌شده در ADR-028: ورود به حالت ساخت مأموریت همیشه به نمای زنده بازمی‌گردد — انتخاب
    // مبدأ/مقصد باید روی داده «الان» انجام شود، نه یک لحظه تاریخی/پخش‌شده دلخواه.
    timeline.returnToLive();
  }

  function exitMissionMode() {
    setMissionMode(false);
  }

  function selectOrigin(marker: OrgMapMarker) {
    if (marker.level !== "WAREHOUSE") return;
    setOriginMarker(marker);
    setPickStage("destination");
  }

  function selectDestinationFromMarker(marker: OrgMapMarker) {
    setDestinationPoint({ organizationUnitId: marker.id, latitude: marker.latitude, longitude: marker.longitude, title: marker.name });
    setPickStage("details");
  }

  function selectDestinationFromMapPick(lngLat: { lat: number; lng: number }) {
    setDestinationPoint({ organizationUnitId: null, latitude: lngLat.lat, longitude: lngLat.lng, title: "نقطه انتخابی روی نقشه" });
    setPickStage("details");
  }

  function confirmManualDestination() {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    setDestinationPoint({ organizationUnitId: null, latitude: lat, longitude: lng, title: "مختصات واردشده" });
    setPickStage("details");
  }

  const interactionMode: MapInteractionMode = !missionMode || pickStage === "details" ? "view" : pickStage === "origin" ? "select-origin" : "select-destination";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">نقشه عملیات</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            نمایش دفاتر و انبارهای ثبت‌شده روی نقشه داخلی سامانه
          </p>
        </div>
        {canCreateMission && !missionMode && (
          <button
            type="button"
            onClick={startMissionMode}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)]"
          >
            <Icon name="missions" className="h-4 w-4" />
            ساخت مأموریت از نقشه
          </button>
        )}
        {missionMode && (
          <button
            type="button"
            onClick={exitMissionMode}
            className="rounded-xl border border-[var(--color-panel-border)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)]"
          >
            خروج از حالت ساخت مأموریت
          </button>
        )}
      </div>

      {!missionMode && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {levelOrder.map((level) => {
              const active = visibleLevels.has(level);
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleLevel(level)}
                  aria-pressed={active}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--color-panel-border)] px-3 py-1.5 text-xs font-medium transition-opacity"
                  style={{ opacity: active ? 1 : 0.4 }}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: levelColor[level] }} />
                  {levelDisplayLabel[level]}
                  <span className="tabular-nums text-[var(--color-text-subtle)]">({countByLevel[level]})</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDesktopFilterOpen((v) => !v)}
              aria-pressed={desktopFilterOpen}
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] xl:flex"
            >
              <Icon name="filter" className="h-3.5 w-3.5" />
              فیلترها
              {isFilterPanelActive(interaction.filter, interaction.query) && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] xl:hidden"
            >
              <Icon name="filter" className="h-3.5 w-3.5" />
              فیلترها
              {isFilterPanelActive(interaction.filter, interaction.query) && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />}
            </button>
          </div>
        </div>
      )}

      {!missionMode && (
        <ActiveFilterChips
          filter={interaction.filter}
          query={interaction.query}
          onFilterChange={interaction.setFilter}
          onQueryChange={interaction.setQuery}
          onReset={interaction.resetFilters}
        />
      )}

      {!missionMode && desktopFilterOpen && (
        <Panel className="hidden p-4 xl:block">
          <MissionFilterForm
            filter={interaction.filter}
            onFilterChange={interaction.setFilter}
            query={interaction.query}
            onQueryChange={interaction.setQuery}
            availableVehicleTypes={availableVehicleTypes}
            onReset={interaction.resetFilters}
            savedViews={interaction.savedViews}
            onSaveView={interaction.saveCurrentView}
            onApplyView={interaction.applySavedView}
            onDeleteView={interaction.deleteSavedView}
          />
        </Panel>
      )}

      {missionMode && pickStage === "origin" && (
        <Panel className="p-3">
          <p className="text-sm font-semibold text-[var(--color-text)]">مرحله ۱ از ۳ — انتخاب انبار مبدأ</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">روی یک marker انبار (سبز) روی نقشه Tap کنید یا از فهرست زیر جست‌وجو کنید.</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
            <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
            <input
              type="search"
              value={originSearch}
              onChange={(e) => setOriginSearch(e.target.value)}
              placeholder="جست‌وجوی انبار..."
              className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
            />
          </div>
          {warehouseMatches.length > 0 && (
            <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
              {warehouseMatches.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => selectOrigin(w)}
                    className="w-full rounded-lg px-2 py-1.5 text-start text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
                  >
                    {w.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {warehouseMatches.length === 0 && <p className="mt-2 text-xs text-[var(--color-text-muted)]">هیچ انباری یافت نشد.</p>}
        </Panel>
      )}

      {missionMode && pickStage === "destination" && (
        <Panel className="p-3">
          <p className="text-sm font-semibold text-[var(--color-text)]">مرحله ۲ از ۳ — انتخاب مقصد</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            روی نقطه دلخواه یا marker مقصد روی نقشه Tap کنید، یا مختصات را مستقیم وارد کنید. مبدأ: <span className="font-medium text-[var(--color-text)]">{originMarker?.name}</span>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-xs">
            <label className="text-xs font-medium text-[var(--color-text)]">
              عرض جغرافیایی
              <input value={manualLat} onChange={(e) => setManualLat(e.target.value)} className="ltr-inline mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs font-medium text-[var(--color-text)]">
              طول جغرافیایی
              <input value={manualLng} onChange={(e) => setManualLng(e.target.value)} className="ltr-inline mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm" />
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={confirmManualDestination} className="rounded-xl border border-[var(--color-panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)]">
              تأیید مختصات
            </button>
            <button type="button" onClick={() => setPickStage("origin")} className="rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              بازگشت به انتخاب مبدأ
            </button>
          </div>
        </Panel>
      )}

      <div className="flex flex-col gap-4 xl:flex-row">
        {/* flex-1 فقط در xl: (ردیف) باید اعمال شود؛ در حالت ستونی (زیر xl) flex-1 روی محور اصلی
            عمودی basis را صفر می‌کند و بدون ارتفاع معین والد، نقشه را تقریباً به ۰ فشرده می‌کند —
            h-[480px]/sm:h-[560px] باید در آن حالت تنها تعیین‌کننده ارتفاع باقی بماند. */}
        <Panel className="h-[480px] overflow-hidden sm:h-[560px] xl:flex-1">
          {providerQuery.isLoading || markersQuery.isLoading ? (
            <MapLoadingState />
          ) : providerQuery.isError || markersQuery.isError ? (
            <DegradedState
              title="بارگذاری داده نقشه ناموفق بود"
              description="در دریافت اطلاعات Provider نقشه یا گره‌های سازمانی خطایی رخ داد. لطفاً بعداً دوباره تلاش کنید."
            />
          ) : !providerQuery.data ? (
            <DegradedState
              title="Provider نقشه تنظیم نشده است"
              description="هیچ Provider نقشه فعالی ثبت نشده. یک Provider داخلی از «تنظیمات سامانه ← Provider نقشه» اضافه کنید."
            />
          ) : (
            <div className="relative h-full w-full">
              <MapLibreMapInner
                provider={providerQuery.data}
                markers={markers}
                visibleLevels={visibleLevels}
                onTileError={() => setTileDegraded(true)}
                interactionMode={interactionMode}
                onMarkerSelect={pickStage === "origin" ? selectOrigin : pickStage === "destination" ? selectDestinationFromMarker : undefined}
                onMapPick={pickStage === "destination" ? selectDestinationFromMapPick : undefined}
                pinPoint={destinationPoint ? { latitude: destinationPoint.latitude, longitude: destinationPoint.longitude } : null}
                vehicles={vehicles}
                selectedMissionId={selectedMissionId}
                onVehicleSelect={interaction.select}
                selectedRoutePreview={selectedRoutePreview}
                onFilterByOrigin={!missionMode ? (marker) => interaction.applyOriginFilter(marker.name) : undefined}
                onFilterByDestination={!missionMode ? (marker) => interaction.applyDestinationFilter(marker.name) : undefined}
              />
              {tileDegraded && (
                <div className="pointer-events-none absolute inset-x-3 top-3 rounded-xl bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning)] shadow">
                  بارگذاری برخی کاشی‌های نقشه ناموفق بود؛ Provider را از تنظیمات سامانه بررسی کنید.
                </div>
              )}
              {!missionMode && vehicles.length > 0 && (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
                  <span className="rounded-full bg-[var(--color-bg-elevated)]/90 px-3 py-1 text-[11px] font-medium text-[var(--color-text-muted)] shadow">
                    {timeline.mode === "LIVE" ? "نمای زنده محاسباتی" : "بازسازی زمانی"} — موقعیت‌ها تقریبی هستند
                  </span>
                </div>
              )}
            </div>
          )}
        </Panel>

        {!missionMode && (
          <Panel className="hidden overflow-hidden md:flex md:h-[480px] md:w-72 md:flex-col xl:h-[560px] xl:w-[400px]">
            <PanelHeader>
              <PanelTitle>مأموریت‌های فعال ({interaction.visibleMissions.length.toLocaleString("fa-IR")})</PanelTitle>
            </PanelHeader>
            <OperationalMissionTable
              missions={interaction.pagedMissions}
              totalFilteredCount={interaction.visibleMissions.length}
              hasMore={interaction.hasMore}
              onLoadMore={interaction.loadMore}
              selectedMissionId={interaction.selectedMissionId}
              onSelect={interaction.select}
              sortField={interaction.sortField}
              sortDirection={interaction.sortDirection}
              onToggleSort={interaction.toggleSort}
              visibleColumns={interaction.visibleColumns}
              onOpenFullDetails={(missionId) => router.push(`/missions/${missionId}`)}
            />
          </Panel>
        )}
      </div>

      {!missionMode && <TimelineSeeker timeline={timeline} />}

      {!missionMode && allMissions.length > 0 && (
        <button
          type="button"
          onClick={() => setMobileTableOpen(true)}
          className="fixed inset-x-4 z-40 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-lg md:hidden"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          نمایش فهرست مأموریت‌ها ({interaction.visibleMissions.length.toLocaleString("fa-IR")})
        </button>
      )}

      <Sheet open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} title="فیلترها">
        <MissionFilterForm
          filter={interaction.filter}
          onFilterChange={interaction.setFilter}
          query={interaction.query}
          onQueryChange={interaction.setQuery}
          availableVehicleTypes={availableVehicleTypes}
          onReset={interaction.resetFilters}
          savedViews={interaction.savedViews}
          onSaveView={interaction.saveCurrentView}
          onApplyView={interaction.applySavedView}
          onDeleteView={interaction.deleteSavedView}
        />
      </Sheet>

      <Sheet open={mobileTableOpen} onClose={() => setMobileTableOpen(false)} title={`مأموریت‌های فعال (${interaction.visibleMissions.length.toLocaleString("fa-IR")})`}>
        <OperationalMissionTable
          missions={interaction.pagedMissions}
          totalFilteredCount={interaction.visibleMissions.length}
          hasMore={interaction.hasMore}
          onLoadMore={interaction.loadMore}
          selectedMissionId={interaction.selectedMissionId}
          onSelect={(missionId) => {
            interaction.select(missionId);
            setMobileTableOpen(false);
          }}
          sortField={interaction.sortField}
          sortDirection={interaction.sortDirection}
          onToggleSort={interaction.toggleSort}
          visibleColumns={interaction.visibleColumns}
          onOpenFullDetails={(missionId) => router.push(`/missions/${missionId}`)}
        />
      </Sheet>

      {missionMode && pickStage === "details" && originMarker && destinationPoint && (
        <MissionMapCreatePanel
          origin={{ id: originMarker.id, name: originMarker.name, latitude: originMarker.latitude, longitude: originMarker.longitude }}
          destination={destinationPoint}
          onChangeOrigin={() => setPickStage("origin")}
          onChangeDestination={() => setPickStage("destination")}
          onClose={exitMissionMode}
          onCreated={(missionId) => router.push(`/missions/${missionId}`)}
        />
      )}

      {!missionMode && selectedMission && (
        <MissionDetailPanel mission={selectedMission} onClose={() => interaction.select(null)} onViewFullDetails={(missionId) => router.push(`/missions/${missionId}`)} />
      )}

      {!missionMode && !selectedMission && (
        <p className="text-xs text-[var(--color-text-subtle)]">
          موقعیت دفاتر و انبارها بر اساس مختصات ثبت‌شده در ساختار سازمانی است. برای مشاهده جزئیات هر نقطه یا خودرو روی آن ضربه بزنید یا کلیک کنید.
        </p>
      )}
    </div>
  );
}
