export function PreviewBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-[var(--color-panel-border)] bg-[var(--color-warning-bg)] px-3 py-1.5 text-center text-xs font-medium text-[var(--color-warning)]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      پیش‌نمایش رابط کاربری — بدون پایگاه‌داده و داده واقعی؛ صرفاً برای نمایش ظاهر و ساختار محصول
    </div>
  );
}
