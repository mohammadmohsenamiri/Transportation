"use client";

import { THEME_STORAGE_KEY } from "./theme-constants";

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // localStorage غیرقابل‌دسترس (حالت خصوصی و مشابه)؛ تغییر theme فقط برای همین session اعمال می‌شود
  }
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="تغییر بین حالت روشن و تیره"
      title="تغییر حالت روشن/تیره"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]"
    >
      <svg viewBox="0 0 24 24" fill="none" className="theme-icon-light h-4.5 w-4.5" aria-hidden="true">
        <path
          d="M12 3v1.5M12 19.5V21M4.5 12H3M21 12h-1.5M6.34 6.34 5.28 5.28M18.72 18.72l-1.06-1.06M6.34 17.66l-1.06 1.06M18.72 5.28l-1.06 1.06"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <svg viewBox="0 0 24 24" fill="none" className="theme-icon-dark h-4.5 w-4.5" aria-hidden="true">
        <path
          d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
