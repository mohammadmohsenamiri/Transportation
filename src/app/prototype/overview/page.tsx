import { KpiCard } from "@/components/ui/kpi-card";
import { DonutChart } from "@/components/ui/donut-chart";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { MissionTable } from "@/components/data-table/mission-table";
import { StatusBadge } from "@/components/ui/badge";
import {
  overviewKpis,
  missionStatusBreakdown,
  vehicleReadinessBreakdown,
  recentMissions,
  recentActivities,
} from "@/demo/fixtures";

export default function PrototypeOverviewPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">فرانمای وضعیت</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">نمای کلی و لحظه‌ای از وضعیت عملیات</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {overviewKpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-4 sm:p-5">
          <PanelTitle className="mb-4">مأموریت‌ها بر اساس وضعیت</PanelTitle>
          <DonutChart segments={missionStatusBreakdown} centerLabel="کل مأموریت‌ها" />
        </Panel>
        <Panel className="p-4 sm:p-5">
          <PanelTitle className="mb-4">خودروها بر اساس آمادگی</PanelTitle>
          <DonutChart segments={vehicleReadinessBreakdown} centerLabel="کل خودروها" />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader>
            <PanelTitle>آخرین مأموریت‌ها</PanelTitle>
            <StatusBadge tone="primary" label="۵ مورد اخیر" />
          </PanelHeader>
          <div className="p-4 sm:p-5">
            <MissionTable missions={recentMissions} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>فعالیت‌های اخیر</PanelTitle>
          </PanelHeader>
          <ul className="flex flex-col gap-4 p-4 sm:p-5">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--color-${activity.tone})` }}
                />
                <div className="min-w-0">
                  <p className="text-sm text-[var(--color-text)]">{activity.text}</p>
                  <p className="tabular-nums ltr-inline mt-0.5 text-xs text-[var(--color-text-subtle)]">{activity.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
