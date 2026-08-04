import { AppShell } from "@/components/layout/app-shell";
import { prototypeNavItems, prototypeMobileNavItems } from "@/components/layout/nav-items";

const demoUser = { displayName: "مهدی احمدی", roleLabel: "مدیر عملیات", initials: "م‌ا" };

export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      navItems={prototypeNavItems}
      mobileNavItems={prototypeMobileNavItems}
      user={demoUser}
      showPreviewBanner
    >
      {children}
    </AppShell>
  );
}
