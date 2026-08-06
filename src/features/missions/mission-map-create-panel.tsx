"use client";

import { useMemo, useState } from "react";
import { JalaliDateTimeInput } from "@/components/ui/jalali-datetime-input";
import { jalaliToUtcIso, utcIsoToJalali, type JalaliDateTime, isValidJalaliDateTime } from "@/lib/dates/jalali";
import { areShipmentsCompatible, shipmentDestinationKey, shipmentMatchesDestinationPoint } from "@/lib/domain/mission-rules";
import { haversineDistanceMeters } from "@/lib/geo/distance";
import { useShipments } from "@/features/shipments/use-shipment-queries";
import { useVehicles } from "@/features/fleet/use-fleet-queries";
import { useRoutes, useCreateRoute } from "@/features/routes/use-route-queries";
import { useCreateMissionDraft, useEstimateMission, usePublishMission } from "@/features/missions/use-mission-queries";
import { ShipmentPickerList, VehiclePickerList, RouteStepPanel, MissionReviewStep } from "@/features/missions/mission-form-parts";
import { RouteCsvImportPanel } from "@/features/routes/route-csv-import-panel";
import { RoutePointEditor } from "@/features/routes/route-point-editor";
import type { DrawPoint } from "@/features/routes/route-draw-map-inner";
import { ApiError } from "@/lib/http/api-client-error";

const DESTINATION_MATCH_TOLERANCE_METERS = 1500;
const ROUTE_TOLERANCE_METERS = 1000;

function defaultStartAtJalali(): JalaliDateTime {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const jalali = utcIsoToJalali(tomorrow.toISOString());
  return { ...jalali, hour: 8, minute: 0 };
}

export interface MissionMapOrigin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface MissionMapDestination {
  organizationUnitId: string | null;
  title: string;
  latitude: number;
  longitude: number;
}

export interface MissionMapCreatePanelProps {
  origin: MissionMapOrigin;
  destination: MissionMapDestination;
  onChangeOrigin: () => void;
  onChangeDestination: () => void;
  onClose: () => void;
  onCreated: (missionId: string) => void;
}

type RouteSubTab = "pick" | "csv" | "draw";

export function MissionMapCreatePanel({ origin, destination, onChangeOrigin, onChangeDestination, onClose, onCreated }: MissionMapCreatePanelProps) {
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [startAt, setStartAt] = useState<JalaliDateTime>(() => defaultStartAtJalali());
  const [routeId, setRouteId] = useState<string | null>(null);
  const [toleranceAcknowledged, setToleranceAcknowledged] = useState(false);
  const [notes, setNotes] = useState("");
  const [routeSubTab, setRouteSubTab] = useState<RouteSubTab>("pick");
  const [drawPoints, setDrawPoints] = useState<DrawPoint[]>([]);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [drawCode, setDrawCode] = useState("");
  const [drawName, setDrawName] = useState("");
  const [drawFormError, setDrawFormError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const shipmentsQuery = useShipments({ availableForMission: true, originWarehouseId: origin.id });
  const vehiclesQuery = useVehicles({ readiness: "READY" });
  const routesQuery = useRoutes({ isActive: true });
  const estimateMutation = useEstimateMission();
  const createDraftMutation = useCreateMissionDraft();
  const publishMutation = usePublishMission();
  const createRouteMutation = useCreateRoute();

  const matchingShipments = useMemo(() => {
    const all = shipmentsQuery.data ?? [];
    return all.filter((s) =>
      shipmentMatchesDestinationPoint(
        { destinationOrganizationUnitId: s.destinationOrganizationUnitId, destinationLatitude: s.destinationLatitude, destinationLongitude: s.destinationLongitude },
        { organizationUnitId: destination.organizationUnitId, latitude: destination.latitude, longitude: destination.longitude },
        DESTINATION_MATCH_TOLERANCE_METERS,
      ),
    );
  }, [shipmentsQuery.data, destination]);

  const selectedShipments = useMemo(() => matchingShipments.filter((s) => selectedShipmentIds.includes(s.id)), [matchingShipments, selectedShipmentIds]);

  const compatibleShipmentIds = useMemo(() => {
    if (selectedShipments.length === 0) return new Set(matchingShipments.map((s) => s.id));
    const key = shipmentDestinationKey(selectedShipments[0]);
    return new Set(
      matchingShipments
        .filter((s) => s.originWarehouseId === selectedShipments[0].originWarehouseId && shipmentDestinationKey(s) === key)
        .map((s) => s.id),
    );
  }, [matchingShipments, selectedShipments]);

  function toggleShipment(shipmentId: string) {
    setSelectedShipmentIds((prev) => (prev.includes(shipmentId) ? prev.filter((id) => id !== shipmentId) : [...prev, shipmentId]));
  }

  const firstSelectedShipment = selectedShipments[0] ?? null;
  const resolvedOrigin = useMemo(
    () =>
      firstSelectedShipment && firstSelectedShipment.originLatitude !== null && firstSelectedShipment.originLongitude !== null
        ? { latitude: firstSelectedShipment.originLatitude, longitude: firstSelectedShipment.originLongitude, title: firstSelectedShipment.originWarehouseName }
        : null,
    [firstSelectedShipment],
  );
  const resolvedDestination = useMemo(
    () =>
      firstSelectedShipment
        ? { latitude: firstSelectedShipment.destinationLatitude, longitude: firstSelectedShipment.destinationLongitude, title: firstSelectedShipment.destinationTitle }
        : null,
    [firstSelectedShipment],
  );

  const selectedVehicle = (vehiclesQuery.data ?? []).find((v) => v.id === vehicleId) ?? null;
  const selectedRoute = (routesQuery.data ?? []).find((r) => r.id === routeId) ?? null;

  const routeMismatch = useMemo(() => {
    if (!selectedRoute || !resolvedOrigin || !resolvedDestination) return null;
    const originDistance = haversineDistanceMeters(resolvedOrigin, { latitude: selectedRoute.originLatitude, longitude: selectedRoute.originLongitude });
    const destinationDistance = haversineDistanceMeters(resolvedDestination, { latitude: selectedRoute.destinationLatitude, longitude: selectedRoute.destinationLongitude });
    if (originDistance > ROUTE_TOLERANCE_METERS || destinationDistance > ROUTE_TOLERANCE_METERS) {
      return { originDistance, destinationDistance };
    }
    return null;
  }, [selectedRoute, resolvedOrigin, resolvedDestination]);

  const startAtValid = isValidJalaliDateTime(startAt);
  const canSubmit =
    selectedShipmentIds.length > 0 &&
    areShipmentsCompatible(selectedShipments) &&
    !!vehicleId &&
    startAtValid &&
    (!routeMismatch || toleranceAcknowledged);

  async function runEstimate() {
    if (!resolvedOrigin || !resolvedDestination || !selectedVehicle) return;
    try {
      return await estimateMutation.mutateAsync({
        originLatitude: resolvedOrigin.latitude,
        originLongitude: resolvedOrigin.longitude,
        destinationLatitude: resolvedDestination.latitude,
        destinationLongitude: resolvedDestination.longitude,
        speedKmh: selectedVehicle.avgSpeedKmh,
        routeId,
        fuelConsumptionPer100Km: selectedVehicle.avgConsumptionPer100Km,
      });
    } catch {
      return undefined;
    }
  }

  async function handleSubmit(publish: boolean) {
    setServerError(null);
    try {
      const payload = {
        shipmentIds: selectedShipmentIds,
        vehicleId,
        startAt: jalaliToUtcIso(startAt),
        routeId,
        notes: notes.trim() || null,
      };
      const created = await createDraftMutation.mutateAsync(payload);
      if (publish) {
        await publishMutation.mutateAsync(created.id);
      }
      onCreated(created.id);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "ذخیره مأموریت ناموفق بود.");
    }
  }

  async function handleSaveDrawnRoute() {
    setDrawFormError(null);
    try {
      const created = await createRouteMutation.mutateAsync({
        code: drawCode,
        name: drawName,
        description: null,
        source: "MAP_DRAWING",
        points: drawPoints.map((p) => ({ sequence: p.sequence, latitude: p.latitude, longitude: p.longitude, label: p.label ?? null })),
      });
      setRouteId(created.id);
      setToleranceAcknowledged(false);
      setShowDrawForm(false);
      setDrawPoints([]);
      setDrawCode("");
      setDrawName("");
      setRouteSubTab("pick");
    } catch (error) {
      setDrawFormError(error instanceof ApiError ? error.message : "ایجاد مسیر ناموفق بود.");
    }
  }

  const pending = createDraftMutation.isPending || publishMutation.isPending;

  return (
    <div className="flex max-h-[70vh] flex-col overflow-y-auto rounded-t-2xl border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-4 shadow-2xl sm:max-h-[75vh] sm:rounded-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text)]">مأموریت جدید از نقشه</h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            مبدأ: <span className="font-medium text-[var(--color-text)]">{origin.name}</span>
            {" — "}
            مقصد: <span className="font-medium text-[var(--color-text)]">{destination.title}</span>
          </p>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          انصراف
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <button type="button" onClick={onChangeOrigin} className="text-[var(--color-primary)] hover:underline">
          تغییر مبدأ
        </button>
        <button type="button" onClick={onChangeDestination} className="text-[var(--color-primary)] hover:underline">
          تغییر مقصد
        </button>
      </div>

      <section className="mt-4">
        <h3 className="text-xs font-semibold text-[var(--color-text)]">مرسوله‌ها</h3>
        {shipmentsQuery.isLoading && <p className="mt-2 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
        {!shipmentsQuery.isLoading && matchingShipments.length === 0 && (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">مرسوله‌ای با این مبدأ/مقصد یافت نشد. از فرم مرسوله، مرسوله جدید بسازید.</p>
        )}
        {matchingShipments.length > 0 && (
          <div className="mt-2">
            <ShipmentPickerList shipments={matchingShipments} selectedIds={selectedShipmentIds} compatibleShipmentIds={compatibleShipmentIds} onToggle={toggleShipment} />
          </div>
        )}
      </section>

      {selectedShipmentIds.length > 0 && (
        <>
          <section className="mt-4">
            <h3 className="text-xs font-semibold text-[var(--color-text)]">خودرو</h3>
            {vehiclesQuery.isLoading && <p className="mt-2 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
            {!vehiclesQuery.isLoading && (vehiclesQuery.data ?? []).length === 0 && <p className="mt-2 text-sm text-[var(--color-text-muted)]">هیچ خودروی آماده‌ای یافت نشد.</p>}
            {(vehiclesQuery.data ?? []).length > 0 && (
              <div className="mt-2">
                <VehiclePickerList vehicles={vehiclesQuery.data ?? []} selectedId={vehicleId} onSelect={setVehicleId} />
              </div>
            )}
          </section>

          <section className="mt-4 max-w-sm">
            <h3 className="text-xs font-semibold text-[var(--color-text)]">زمان حرکت</h3>
            <div className="mt-2">
              <JalaliDateTimeInput value={startAt} onChange={setStartAt} error={!startAtValid ? "زمان شروع باید یک تاریخ/ساعت معتبر در آینده باشد." : null} />
            </div>
          </section>

          <section className="mt-4">
            <h3 className="text-xs font-semibold text-[var(--color-text)]">مسیر</h3>
            <div className="mt-2 flex w-fit rounded-xl border border-[var(--color-panel-border)] p-1">
              {(["pick", "csv", "draw"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRouteSubTab(tab)}
                  aria-pressed={routeSubTab === tab}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    routeSubTab === tab ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {tab === "pick" ? "انتخاب از فهرست" : tab === "csv" ? "وارد کردن CSV" : "ترسیم روی نقشه"}
                </button>
              ))}
            </div>

            {routeSubTab === "pick" && (
              <div className="mt-3">
                <RouteStepPanel
                  routes={routesQuery.data ?? []}
                  routeId={routeId}
                  onRouteChange={(value) => {
                    setRouteId(value);
                    setToleranceAcknowledged(false);
                  }}
                  routeMismatch={routeMismatch}
                  toleranceAcknowledged={toleranceAcknowledged}
                  onToleranceChange={setToleranceAcknowledged}
                />
              </div>
            )}

            {routeSubTab === "csv" && (
              <div className="mt-3">
                <RouteCsvImportPanel
                  onImported={(id) => {
                    setRouteId(id);
                    setToleranceAcknowledged(false);
                    setRouteSubTab("pick");
                  }}
                />
              </div>
            )}

            {routeSubTab === "draw" && !showDrawForm && (
              <div className="mt-3">
                <RoutePointEditor
                  initialPoints={drawPoints}
                  onFinish={(points) => {
                    setDrawPoints(points);
                    setShowDrawForm(true);
                  }}
                  onCancel={() => setRouteSubTab("pick")}
                />
              </div>
            )}

            {routeSubTab === "draw" && showDrawForm && (
              <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[var(--color-panel-border)] p-3">
                <label className="text-xs font-medium text-[var(--color-text)]">
                  شناسه مسیر
                  <input
                    value={drawCode}
                    onChange={(e) => setDrawCode(e.target.value)}
                    className="ltr-inline mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm"
                    placeholder="RT-1404-003"
                  />
                </label>
                <label className="text-xs font-medium text-[var(--color-text)]">
                  نام مسیر
                  <input
                    value={drawName}
                    onChange={(e) => setDrawName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm"
                  />
                </label>
                {drawFormError && <p className="text-xs text-[var(--color-danger)]">{drawFormError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowDrawForm(false)} className="rounded-xl border border-[var(--color-panel-border)] px-3 py-1.5 text-xs text-[var(--color-text)]">
                    بازگشت به ویرایش نقاط
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDrawnRoute}
                    disabled={!drawCode || !drawName || createRouteMutation.isPending}
                    className="rounded-xl bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
                  >
                    {createRouteMutation.isPending ? "در حال ذخیره..." : "ذخیره مسیر"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="mt-4">
            <h3 className="text-xs font-semibold text-[var(--color-text)]">بازبینی</h3>
            <div className="mt-2">
              <MissionReviewStep
                origin={resolvedOrigin}
                destination={resolvedDestination}
                vehicleIdentifier={selectedVehicle?.identifier ?? "—"}
                startAt={startAt}
                routeName={selectedRoute?.name ?? null}
                shipmentTitles={selectedShipments.map((s) => s.title)}
                notes={notes}
                onNotesChange={setNotes}
                estimate={estimateMutation.data}
                estimatePending={estimateMutation.isPending}
                onRunEstimate={runEstimate}
                serverError={serverError}
              />
            </div>
          </section>
        </>
      )}

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--color-panel-border)] pt-3">
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={!canSubmit || pending}
          className="rounded-xl border border-[var(--color-panel-border)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] disabled:opacity-50"
        >
          {pending ? "در حال ذخیره..." : "ذخیره پیش‌نویس"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={!canSubmit || pending}
          className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {pending ? "در حال انتشار..." : "انتشار مأموریت"}
        </button>
      </div>
    </div>
  );
}
