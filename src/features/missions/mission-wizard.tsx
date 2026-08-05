"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { Icon } from "@/components/ui/icons";
import { JalaliDateTimeInput } from "@/components/ui/jalali-datetime-input";
import { jalaliToUtcIso, utcIsoToJalali, isValidJalaliDateTime, type JalaliDateTime } from "@/lib/dates/jalali";
import { areShipmentsCompatible, shipmentDestinationKey } from "@/lib/domain/mission-rules";
import { haversineDistanceMeters } from "@/lib/geo/distance";
import { useShipments } from "@/features/shipments/use-shipment-queries";
import { useVehicles } from "@/features/fleet/use-fleet-queries";
import { useRoutes } from "@/features/routes/use-route-queries";
import {
  useCreateMissionDraft,
  useEstimateMission,
  usePublishMission,
  useUpdateMission,
} from "@/features/missions/use-mission-queries";
import { ApiError } from "@/lib/http/api-client-error";
import type { DrawPoint } from "@/features/routes/route-draw-map-inner";
import { useActiveMapProvider } from "@/features/map/use-map-queries";
import type { Mission } from "@/features/missions/types";

const RouteDrawMapInner = dynamic(
  () => import("@/features/routes/route-draw-map-inner").then((mod) => mod.RouteDrawMapInner),
  { ssr: false, loading: () => <MapLoadingState /> },
);

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-muted)]">
      در حال بارگذاری نقشه...
    </div>
  );
}

const ROUTE_TOLERANCE_METERS = 1000;

const STEP_LABELS = ["مرسوله", "مبدأ و مقصد", "خودرو", "زمان حرکت", "مسیر", "بازبینی"];

function defaultStartAt(): JalaliDateTime {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const jalali = utcIsoToJalali(tomorrow.toISOString());
  return { ...jalali, hour: 8, minute: 0 };
}

function formatKm(meters: number): string {
  return `${(meters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes.toLocaleString("fa-IR")} دقیقه`;
  return `${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString("fa-IR")} دقیقه`;
}

export interface MissionWizardProps {
  editMission?: Mission;
}

export function MissionWizard({ editMission }: MissionWizardProps) {
  const router = useRouter();
  const isEdit = !!editMission;
  const [step, setStep] = useState(0);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>(() => editMission?.shipments.map((s) => s.id) ?? []);
  const [vehicleId, setVehicleId] = useState(() => editMission?.vehicleId ?? "");
  const [startAt, setStartAt] = useState<JalaliDateTime>(() => (editMission ? utcIsoToJalali(editMission.startAt) : defaultStartAt()));
  const [routeId, setRouteId] = useState<string | null>(() => editMission?.routeId ?? null);
  const [toleranceAcknowledged, setToleranceAcknowledged] = useState(false);
  const [notes, setNotes] = useState(() => editMission?.notes ?? "");
  const [shipmentSearch, setShipmentSearch] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const shipmentsQuery = useShipments({ availableForMission: true, q: shipmentSearch || undefined });
  const vehiclesQuery = useVehicles({ readiness: "READY" });
  const routesQuery = useRoutes({ isActive: true });
  const providerQuery = useActiveMapProvider();
  const estimateMutation = useEstimateMission();
  const createDraftMutation = useCreateMissionDraft();
  const updateMutation = useUpdateMission();
  const publishMutation = usePublishMission();

  const allShipments = useMemo(() => shipmentsQuery.data ?? [], [shipmentsQuery.data]);
  const selectedShipments = useMemo(
    () => allShipments.filter((s) => selectedShipmentIds.includes(s.id)),
    [allShipments, selectedShipmentIds],
  );

  const compatibleShipments = useMemo(() => {
    if (selectedShipments.length === 0) return allShipments;
    const key = shipmentDestinationKey({
      originWarehouseId: selectedShipments[0].originWarehouseId,
      destinationOrganizationUnitId: selectedShipments[0].destinationOrganizationUnitId,
      destinationLatitude: selectedShipments[0].destinationLatitude,
      destinationLongitude: selectedShipments[0].destinationLongitude,
    });
    return allShipments.filter(
      (s) =>
        s.originWarehouseId === selectedShipments[0].originWarehouseId &&
        shipmentDestinationKey({
          originWarehouseId: s.originWarehouseId,
          destinationOrganizationUnitId: s.destinationOrganizationUnitId,
          destinationLatitude: s.destinationLatitude,
          destinationLongitude: s.destinationLongitude,
        }) === key,
    );
  }, [allShipments, selectedShipments]);

  function toggleShipment(shipmentId: string) {
    setSelectedShipmentIds((prev) => (prev.includes(shipmentId) ? prev.filter((id) => id !== shipmentId) : [...prev, shipmentId]));
  }

  const firstSelectedShipment = selectedShipments[0] ?? null;
  const origin = useMemo(
    () =>
      firstSelectedShipment && firstSelectedShipment.originLatitude !== null && firstSelectedShipment.originLongitude !== null
        ? {
            latitude: firstSelectedShipment.originLatitude,
            longitude: firstSelectedShipment.originLongitude,
            title: firstSelectedShipment.originWarehouseName,
          }
        : null,
    [firstSelectedShipment],
  );
  const destination = useMemo(
    () =>
      firstSelectedShipment
        ? {
            latitude: firstSelectedShipment.destinationLatitude,
            longitude: firstSelectedShipment.destinationLongitude,
            title: firstSelectedShipment.destinationTitle,
          }
        : null,
    [firstSelectedShipment],
  );

  const previewPoints = useMemo<DrawPoint[]>(() => {
    const points: DrawPoint[] = [];
    if (origin) {
      points.push({ sequence: 1, latitude: origin.latitude, longitude: origin.longitude, label: "مبدأ" });
    }
    if (destination) {
      points.push({ sequence: 2, latitude: destination.latitude, longitude: destination.longitude, label: "مقصد" });
    }
    return points;
  }, [origin, destination]);

  const selectedVehicle = (vehiclesQuery.data ?? []).find((v) => v.id === vehicleId) ?? null;
  const selectedRoute = (routesQuery.data ?? []).find((r) => r.id === routeId) ?? null;

  const routeMismatch = useMemo(() => {
    if (!selectedRoute || !origin || !destination) return null;
    const originDistance = haversineDistanceMeters(origin, { latitude: selectedRoute.originLatitude, longitude: selectedRoute.originLongitude });
    const destinationDistance = haversineDistanceMeters(destination, {
      latitude: selectedRoute.destinationLatitude,
      longitude: selectedRoute.destinationLongitude,
    });
    if (originDistance > ROUTE_TOLERANCE_METERS || destinationDistance > ROUTE_TOLERANCE_METERS) {
      return { originDistance, destinationDistance };
    }
    return null;
  }, [selectedRoute, origin, destination]);

  // بررسی «در آینده بودن» به سرور موکول شده (validate در boundary)؛ اینجا فقط اعتبار ساختاری تاریخ/ساعت بررسی می‌شود
  // تا فراخوانی Date.now() در حین render نقض قاعده purity کامپوننت نشود.
  const startAtValid = isValidJalaliDateTime(startAt);

  const canProceed: Record<number, boolean> = {
    0: selectedShipmentIds.length > 0 && areShipmentsCompatible(selectedShipments),
    1: !!origin && !!destination,
    2: !!vehicleId,
    3: startAtValid,
    4: !routeMismatch || toleranceAcknowledged,
    5: true,
  };

  async function runEstimate() {
    if (!origin || !destination || !selectedVehicle) return;
    try {
      const result = await estimateMutation.mutateAsync({
        originLatitude: origin.latitude,
        originLongitude: origin.longitude,
        destinationLatitude: destination.latitude,
        destinationLongitude: destination.longitude,
        speedKmh: selectedVehicle.avgSpeedKmh,
        routeId,
        fuelConsumptionPer100Km: selectedVehicle.avgConsumptionPer100Km,
      });
      return result;
    } catch {
      return undefined;
    }
  }

  function goNext() {
    if (!canProceed[step]) return;
    if (step === 4 && estimateMutation.data === undefined) {
      void runEstimate();
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
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
      const missionId = isEdit
        ? (await updateMutation.mutateAsync({ id: editMission!.id, payload })).id
        : (await createDraftMutation.mutateAsync(payload)).id;
      if (publish) {
        await publishMutation.mutateAsync(missionId);
      }
      router.push(`/missions/${missionId}`);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "ذخیره مأموریت ناموفق بود.");
    }
  }

  const pending = createDraftMutation.isPending || updateMutation.isPending || publishMutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">{isEdit ? `ویرایش مأموریت ${editMission!.code}` : "مأموریت جدید"}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">مرسوله، مبدأ/مقصد، خودرو، زمان حرکت و مسیر را انتخاب کنید</p>
      </div>

      <ol className="flex flex-wrap items-center gap-1.5 text-xs">
        {STEP_LABELS.map((label, index) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-semibold ${
                index === step
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : index < step
                    ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                    : "bg-[var(--color-bg-sunken)] text-[var(--color-text-muted)]"
              }`}
            >
              {(index + 1).toLocaleString("fa-IR")}
            </span>
            <span className={index === step ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>{label}</span>
            {index < STEP_LABELS.length - 1 && <Icon name="chevron-left" className="h-3 w-3 rotate-180 text-[var(--color-text-subtle)]" />}
          </li>
        ))}
      </ol>

      <Panel className="p-4">
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
              <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
              <input
                type="search"
                value={shipmentSearch}
                onChange={(e) => setShipmentSearch(e.target.value)}
                placeholder="جست‌وجو در مرسوله‌های قابل تخصیص..."
                className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
              />
            </div>
            {shipmentsQuery.isLoading && <p className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
            {!shipmentsQuery.isLoading && allShipments.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">هیچ مرسوله قابل تخصیصی یافت نشد.</p>
            )}
            <ul className="flex flex-col gap-2">
              {allShipments.map((shipment) => {
                const isCompatible = compatibleShipments.some((s) => s.id === shipment.id);
                const checked = selectedShipmentIds.includes(shipment.id);
                return (
                  <li key={shipment.id}>
                    <label
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${
                        checked
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                          : isCompatible
                            ? "border-[var(--color-panel-border)] hover:bg-[var(--color-bg-sunken)]"
                            : "border-[var(--color-panel-border)] opacity-40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && !isCompatible}
                          onChange={() => toggleShipment(shipment.id)}
                          className="h-4 w-4 rounded"
                        />
                        <div>
                          <p className="font-medium text-[var(--color-text)]">{shipment.title}</p>
                          <p className="ltr-inline text-xs text-[var(--color-text-muted)]">{shipment.trackingCode}</p>
                        </div>
                      </div>
                      <div className="text-end text-xs text-[var(--color-text-muted)]">
                        <p>{shipment.originWarehouseName}</p>
                        <p>← {shipment.destinationTitle}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
            {selectedShipmentIds.length > 0 && !areShipmentsCompatible(selectedShipments) && (
              <p className="text-xs text-[var(--color-danger)]">مرسوله‌های انتخاب‌شده باید مبدأ و مقصد یکسان داشته باشند.</p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-panel-border)] p-3">
                <p className="text-xs text-[var(--color-text-muted)]">مبدأ (انبار)</p>
                <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{origin?.title ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-panel-border)] p-3">
                <p className="text-xs text-[var(--color-text-muted)]">مقصد</p>
                <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{destination?.title ?? "—"}</p>
              </div>
            </div>
            <Panel className="h-[280px] overflow-hidden sm:h-[320px]">
              {providerQuery.isLoading ? (
                <MapLoadingState />
              ) : !providerQuery.data ? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
                  Provider نقشه تنظیم نشده است.
                </div>
              ) : (
                <RouteDrawMapInner
                  provider={providerQuery.data}
                  points={previewPoints}
                  editable={false}
                  onMapClick={() => {}}
                  onPointDragEnd={() => {}}
                  onCenterChange={() => {}}
                />
              )}
            </Panel>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            {vehiclesQuery.isLoading && <p className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
            {!vehiclesQuery.isLoading && (vehiclesQuery.data ?? []).length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">هیچ خودروی آماده‌ای یافت نشد.</p>
            )}
            <ul className="flex flex-col gap-2">
              {(vehiclesQuery.data ?? []).map((vehicle) => (
                <li key={vehicle.id}>
                  <label
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${
                      vehicleId === vehicle.id ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]" : "border-[var(--color-panel-border)] hover:bg-[var(--color-bg-sunken)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" name="vehicle" checked={vehicleId === vehicle.id} onChange={() => setVehicleId(vehicle.id)} className="h-4 w-4" />
                      <div>
                        <p className="ltr-inline font-medium text-[var(--color-text)]">{vehicle.identifier}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{vehicle.vehicleTypeName}</p>
                      </div>
                    </div>
                    <p className="tabular-nums text-xs text-[var(--color-text-muted)]">{vehicle.avgSpeedKmh.toLocaleString("fa-IR")} km/h</p>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-sm">
            <JalaliDateTimeInput value={startAt} onChange={setStartAt} error={!startAtValid ? "زمان شروع باید یک تاریخ/ساعت معتبر در آینده باشد." : null} />
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-[var(--color-text)]">
              مسیر (اختیاری)
              <select
                value={routeId ?? ""}
                onChange={(e) => {
                  setRouteId(e.target.value || null);
                  setToleranceAcknowledged(false);
                }}
                className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
              >
                <option value="">بدون مسیر (خط مستقیم)</option>
                {(routesQuery.data ?? []).map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name} ({formatKm(route.totalDistanceMeters)})
                  </option>
                ))}
              </select>
            </label>
            {routeMismatch && (
              <div className="rounded-xl bg-[var(--color-warning-bg)] p-3 text-xs text-[var(--color-warning)]">
                <p>
                  ابتدا/انتهای مسیر انتخاب‌شده با مبدأ/مقصد مأموریت مطابقت ندارد (فاصله تا مبدأ:{" "}
                  {formatKm(routeMismatch.originDistance)}، فاصله تا مقصد: {formatKm(routeMismatch.destinationDistance)}).
                </p>
                <label className="mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={toleranceAcknowledged} onChange={(e) => setToleranceAcknowledged(e.target.checked)} className="h-4 w-4 rounded" />
                  با وجود این عدم تطابق ادامه می‌دهم.
                </label>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <MissionReviewStep
            origin={origin}
            destination={destination}
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
        )}
      </Panel>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="rounded-xl border border-[var(--color-panel-border)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] disabled:opacity-40"
        >
          قبلی
        </button>
        {step < STEP_LABELS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed[step]}
            className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            بعدی
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={pending}
              className="rounded-xl border border-[var(--color-panel-border)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] disabled:opacity-50"
            >
              {pending ? "در حال ذخیره..." : isEdit ? "ذخیره تغییرات" : "ذخیره پیش‌نویس"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={pending}
              className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              {pending ? "در حال انتشار..." : isEdit ? "ذخیره و انتشار" : "انتشار مأموریت"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MissionReviewStep({
  origin,
  destination,
  vehicleIdentifier,
  startAt,
  routeName,
  shipmentTitles,
  notes,
  onNotesChange,
  estimate,
  estimatePending,
  onRunEstimate,
  serverError,
}: {
  origin: { title: string } | null;
  destination: { title: string } | null;
  vehicleIdentifier: string;
  startAt: JalaliDateTime;
  routeName: string | null;
  shipmentTitles: string[];
  notes: string;
  onNotesChange: (value: string) => void;
  estimate?: { distanceMeters: number; durationSeconds: number; isFallbackDirect: boolean; estimatedFuelLiters: number | null };
  estimatePending: boolean;
  onRunEstimate: () => void;
  serverError: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">مرسوله‌ها</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">{shipmentTitles.join("، ")}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">مبدأ ← مقصد</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">
            {origin?.title} ← {destination?.title}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">خودرو</dt>
          <dd className="ltr-inline mt-0.5 text-[var(--color-text)]">{vehicleIdentifier}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">زمان حرکت</dt>
          <dd className="tabular-nums mt-0.5 text-[var(--color-text)]">
            {startAt.year}/{startAt.month}/{startAt.day} — {String(startAt.hour).padStart(2, "0")}:{String(startAt.minute).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">مسیر</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">{routeName ?? "بدون مسیر (خط مستقیم)"}</dd>
        </div>
      </dl>

      <div className="rounded-xl border border-[var(--color-panel-border)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-text)]">تخمین سفر</p>
          <button type="button" onClick={onRunEstimate} disabled={estimatePending} className="text-xs text-[var(--color-primary)] disabled:opacity-50">
            {estimatePending ? "در حال محاسبه..." : "محاسبه دوباره"}
          </button>
        </div>
        {estimate ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="tabular-nums text-lg font-bold text-[var(--color-text)]">{formatKm(estimate.distanceMeters)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">فاصله{estimate.isFallbackDirect ? " (خط مستقیم)" : ""}</p>
            </div>
            <div>
              <p className="tabular-nums text-lg font-bold text-[var(--color-text)]">{formatDuration(estimate.durationSeconds)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">زمان سفر تقریبی</p>
            </div>
            <div>
              <p className="tabular-nums text-lg font-bold text-[var(--color-text)]">
                {estimate.estimatedFuelLiters !== null ? `${estimate.estimatedFuelLiters.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} L` : "—"}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">سوخت تقریبی</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">برای مشاهده تخمین، «محاسبه دوباره» را بزنید.</p>
        )}
      </div>

      <label className="text-xs font-medium text-[var(--color-text)]">
        توضیحات (اختیاری)
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </label>

      {serverError && <p className="text-xs text-[var(--color-danger)]">{serverError}</p>}
    </div>
  );
}
