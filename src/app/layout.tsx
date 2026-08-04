import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-constants";

export const metadata: Metadata = {
  title: "آرمان حمل — سامانه مدیریت حمل‌ونقل",
  description: "سامانه فارسی و راست‌به‌چپ مدیریت حمل بار، تعریف مأموریت و پایش تقریبی خودروها روی نقشه.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
