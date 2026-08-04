import type { IconName } from "@/components/ui/icons";
import type { RoleCode } from "@/lib/permissions/roles";

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  enabled: boolean;
  requiredRoles?: RoleCode[];
}

export const prototypeNavItems: NavItem[] = [
  { id: "map", label: "نقشه عملیات", icon: "map", href: "/prototype/map", enabled: true },
  { id: "overview", label: "فرانمای وضعیت", icon: "dashboard", href: "/prototype/overview", enabled: true },
  { id: "missions", label: "مأموریت‌ها", icon: "missions", href: "#", enabled: false },
  { id: "shipments", label: "مرسوله‌ها", icon: "shipments", href: "#", enabled: false },
  { id: "routes", label: "مسیرها", icon: "routes", href: "#", enabled: false },
  { id: "vehicles", label: "ناوگان", icon: "vehicles", href: "#", enabled: false },
  { id: "organization", label: "ساختار سازمانی", icon: "organization", href: "#", enabled: false },
  { id: "settings", label: "تنظیمات", icon: "settings", href: "#", enabled: false },
];

export const prototypeMobileNavItems: NavItem[] = [
  { id: "overview", label: "وضعیت", icon: "dashboard", href: "/prototype/overview", enabled: true },
  { id: "map", label: "نقشه", icon: "map", href: "/prototype/map", enabled: true },
  { id: "missions", label: "مأموریت‌ها", icon: "missions", href: "#", enabled: false },
  { id: "settings", label: "تنظیمات", icon: "settings", href: "#", enabled: false },
];

export const authNavItems: NavItem[] = [
  { id: "dashboard", label: "داشبورد", icon: "dashboard", href: "/dashboard", enabled: true },
  { id: "map", label: "نقشه عملیات", icon: "map", href: "#", enabled: false },
  { id: "missions", label: "مأموریت‌ها", icon: "missions", href: "#", enabled: false },
  { id: "shipments", label: "مرسوله‌ها", icon: "shipments", href: "#", enabled: false },
  { id: "routes", label: "مسیرها", icon: "routes", href: "#", enabled: false },
  { id: "vehicles", label: "ناوگان", icon: "vehicles", href: "#", enabled: false },
  {
    id: "organization",
    label: "ساختار سازمانی",
    icon: "organization",
    href: "/organization",
    enabled: true,
    requiredRoles: ["ADMIN"],
  },
  { id: "settings", label: "تنظیمات", icon: "settings", href: "#", enabled: false },
];

export const authMobileNavItems: NavItem[] = [
  { id: "dashboard", label: "داشبورد", icon: "dashboard", href: "/dashboard", enabled: true },
  {
    id: "organization",
    label: "سازمان",
    icon: "organization",
    href: "/organization",
    enabled: true,
    requiredRoles: ["ADMIN"],
  },
  { id: "missions", label: "مأموریت‌ها", icon: "missions", href: "#", enabled: false },
  { id: "settings", label: "تنظیمات", icon: "settings", href: "#", enabled: false },
];
