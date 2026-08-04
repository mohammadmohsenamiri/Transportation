import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-[var(--shadow-panel)] backdrop-blur-sm",
        className ?? "",
      )}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 border-b border-[var(--color-panel-border)] px-4 py-3 sm:px-5", className ?? "")}
      {...props}
    />
  );
}

export function PanelTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-sm font-semibold text-[var(--color-text)] sm:text-base", className ?? "")} {...props} />;
}
