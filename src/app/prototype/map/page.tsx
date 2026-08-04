"use client";

import { useState } from "react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { MissionTable } from "@/components/data-table/mission-table";
import { DemoMap } from "@/components/map/demo-map";
import { MissionDetailCard } from "@/components/map/mission-detail-card";
import { TimeSeeker } from "@/components/map/time-seeker";
import { FilterBar } from "@/components/map/filter-bar";
import { StatusBadge } from "@/components/ui/badge";
import { mapKpis, activeMissionsTable, demoVehicleMarkers, selectedMissionDetail } from "@/demo/fixtures";
import type { DemoVehicleMarker } from "@/demo/fixtures";

export default function PrototypeMapPage() {
  const [selected, setSelected] = useState<DemoVehicleMarker>(demoVehicleMarkers[0]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">نقشه عملیات</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">مشاهده نمایشی موقعیت ناوگان و مأموریت‌های فعال</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {mapKpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <FilterBar />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_260px]">
            <div className="h-[360px] sm:h-[440px]">
              <DemoMap markers={demoVehicleMarkers} selectedId={selected.id} onSelect={setSelected} />
            </div>
            <div className="sm:h-[440px] sm:overflow-y-auto">
              <MissionDetailCard marker={selected} detail={selectedMissionDetail} />
            </div>
          </div>
          <TimeSeeker />
        </div>

        <Panel className="flex flex-col">
          <PanelHeader>
            <PanelTitle>مأموریت‌های فعال</PanelTitle>
            <StatusBadge tone="primary" label={`${activeMissionsTable.length} مورد`} />
          </PanelHeader>
          <div className="max-h-[520px] overflow-y-auto p-4 sm:p-5">
            <MissionTable missions={activeMissionsTable} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
