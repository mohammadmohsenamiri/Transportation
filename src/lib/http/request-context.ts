import { headers } from "next/headers";

export async function getRequestContext(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0]!.trim() : null;
  const userAgent = headerList.get("user-agent");
  return { ipAddress, userAgent };
}
