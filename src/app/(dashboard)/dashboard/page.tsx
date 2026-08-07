import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { RoleCode, roleLabel } from "@/lib/permissions/roles";
import { DashboardView, type DashboardPermissions } from "@/features/dashboard/dashboard-view";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.roles.includes(RoleCode.ADMIN);
  const isPlanner = user.roles.includes(RoleCode.MISSION_PLANNER);

  /*
    خودِ اعداد فرانما برای هر سه نقش قابل مشاهده‌اند (PROJECT_SPEC.md §۴)، ولی لینک drill-down فقط
    وقتی رندر می‌شود که کاربر واقعاً به صفحه مقصد دسترسی داشته باشد — در غیر این صورت لینک به یک
    صفحه «عدم دسترسی» ختم می‌شد. این صرفاً پنهان‌کردن UI است و جایگزین گیت واقعی سمت سرور نیست؛
    هر صفحه/endpoint مقصد مجوز خودش را مستقلاً اعمال می‌کند (CLAUDE.md §۲).
  */
  const permissions: DashboardPermissions = {
    missions: isAdmin || isPlanner,
    shipments: isAdmin || isPlanner,
    fleet: isAdmin,
    organization: isAdmin,
  };

  // برچسب نقش‌ها همین‌جا (server component) ترجمه می‌شود؛ `roles.ts` مقدار enum را از Prisma client
  // می‌گیرد و وارد کردنش در کامپوننت client، Prisma را به bundle مرورگر می‌کشد و build را می‌شکند.
  const roleLabels = user.roles.map((role) => roleLabel[role]);

  return (
    <DashboardView permissions={permissions} username={user.username} roleLabels={roleLabels} />
  );
}
