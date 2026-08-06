import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // برخی محیط‌های محلی سرور dev را از طریق 127.0.0.1 (نه localhost) باز می‌کنند؛
  // بدون این مقدار، Next.js درخواست chunk/HMR را cross-origin تشخیص و مسدود می‌کند
  // که باعث می‌شود صفحه فقط HTML اولیه را نشان دهد و هرگز hydrate نشود (بارگذاری بی‌پایان،
  // دکمه‌ها و نقشه بی‌اثر).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
