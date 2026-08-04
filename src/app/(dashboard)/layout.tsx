import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AppShell } from "@/components/layout/app-shell";
import { authNavItems, authMobileNavItems } from "@/components/layout/nav-items";
import { roleLabel } from "@/lib/permissions/roles";
import { logoutAction } from "@/lib/auth/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  const primaryRole = user.roles[0];

  return (
    <AppShell
      navItems={authNavItems}
      mobileNavItems={authMobileNavItems}
      user={{
        displayName: user.username,
        roleLabel: primaryRole ? roleLabel[primaryRole] : "بدون نقش",
        initials: user.username.slice(0, 2),
      }}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
