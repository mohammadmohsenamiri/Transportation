import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/permissions/roles";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">
          خوش آمدید، {user.username}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          ورود شما با موفقیت انجام شد و به پوسته محافظت‌شده سامانه دسترسی دارید.
        </p>
      </div>

      <Panel className="p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">نقش‌های شما</h2>
        <div className="flex flex-wrap gap-2">
          {user.roles.length === 0 && (
            <span className="text-sm text-[var(--color-text-muted)]">هیچ نقشی برای این کاربر تعریف نشده است.</span>
          )}
          {user.roles.map((role) => (
            <StatusBadge key={role} tone="primary" label={roleLabel[role]} />
          ))}
        </div>
      </Panel>

      <Panel className="p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">وضعیت این فاز</h2>
        <p className="text-sm leading-7 text-[var(--color-text-muted)]">
          این نسخه فقط ورود واقعی، مدیریت session و پوسته محافظت‌شده را پیاده‌سازی می‌کند. فرانمای
          وضعیت واقعی با KPIها و نمودارها در Phase 13 اضافه می‌شود؛ مدیریت ساختار سازمانی، خودروها،
          مسیرها و مأموریت‌ها نیز طی فازهای بعدی ساخته خواهند شد.
        </p>
      </Panel>
    </div>
  );
}
