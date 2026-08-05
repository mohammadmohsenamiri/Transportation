import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasAnyRole } from "@/lib/permissions/roles";
import { Panel } from "@/components/ui/panel";
import { ShipmentDetailView } from "@/features/shipments/shipment-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasAnyRole(user.roles, ["ADMIN", "MISSION_PLANNER"])) {
    return (
      <Panel className="p-6 text-center">
        <h1 className="text-base font-bold text-[var(--color-text)]">دسترسی مجاز نیست</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          مشاهده مرسوله فقط برای نقش‌های برنامه‌ریز مأموریت و مدیر سامانه مجاز است.
        </p>
      </Panel>
    );
  }

  const { id } = await params;
  return <ShipmentDetailView shipmentId={id} canManage />;
}
