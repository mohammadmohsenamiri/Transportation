import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import { validateTileUrlTemplate } from "@/lib/domain/map-provider-rules";
import { Prisma } from "@/generated/prisma/client";
import type { MapProvider, MapProviderHealthStatus, MapProviderKind } from "@/generated/prisma/client";
import type { MapProviderCreateInput, MapProviderUpdateInput } from "@/lib/validation/map-provider";

export interface MapProviderDTO {
  id: string;
  name: string;
  kind: MapProviderKind;
  urlTemplate: string;
  attribution: string | null;
  minZoom: number;
  maxZoom: number;
  tileSize: number;
  subdomains: string[] | null;
  requiresApiKey: boolean;
  secretReference: string | null;
  isDefault: boolean;
  isEnabled: boolean;
  healthStatus: MapProviderHealthStatus;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMapProviderDTO {
  id: string;
  name: string;
  kind: MapProviderKind;
  urlTemplate: string;
  attribution: string | null;
  minZoom: number;
  maxZoom: number;
  tileSize: number;
  subdomains: string[] | null;
}

function toDTO(provider: MapProvider): MapProviderDTO {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    urlTemplate: provider.urlTemplate,
    attribution: provider.attribution,
    minZoom: provider.minZoom,
    maxZoom: provider.maxZoom,
    tileSize: provider.tileSize,
    subdomains: (provider.subdomains as string[] | null) ?? null,
    requiresApiKey: provider.requiresApiKey,
    secretReference: provider.secretReference,
    isDefault: provider.isDefault,
    isEnabled: provider.isEnabled,
    healthStatus: provider.healthStatus,
    lastCheckedAt: provider.lastCheckedAt?.toISOString() ?? null,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  };
}

function toPublicDTO(provider: MapProvider): PublicMapProviderDTO {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    urlTemplate: provider.urlTemplate,
    attribution: provider.attribution,
    minZoom: provider.minZoom,
    maxZoom: provider.maxZoom,
    tileSize: provider.tileSize,
    subdomains: (provider.subdomains as string[] | null) ?? null,
  };
}

export async function listMapProviders(): Promise<MapProviderDTO[]> {
  const providers = await prisma.mapProvider.findMany({
    where: { deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return providers.map(toDTO);
}

export async function getMapProviderById(id: string): Promise<MapProviderDTO | null> {
  const provider = await prisma.mapProvider.findFirst({ where: { id, deletedAt: null } });
  return provider ? toDTO(provider) : null;
}

export async function getActivePublicProvider(): Promise<PublicMapProviderDTO | null> {
  const provider = await prisma.mapProvider.findFirst({
    where: { deletedAt: null, isEnabled: true, isDefault: true },
  });
  if (provider) return toPublicDTO(provider);

  const anyEnabled = await prisma.mapProvider.findFirst({
    where: { deletedAt: null, isEnabled: true },
    orderBy: { createdAt: "asc" },
  });
  return anyEnabled ? toPublicDTO(anyEnabled) : null;
}

function assertValidUrl(urlTemplate: string, kind: MapProviderKind): void {
  const result = validateTileUrlTemplate(urlTemplate, kind);
  if (!result.valid) {
    throw new DomainError("MAP_PROVIDER_INVALID_URL", result.error ?? "آدرس نامعتبر است.", {
      urlTemplate: result.error ?? "آدرس نامعتبر است.",
    });
  }
}

export async function createMapProvider(
  input: MapProviderCreateInput,
  actor: ActorContext,
): Promise<MapProviderDTO> {
  assertValidUrl(input.urlTemplate, input.kind);

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.mapProvider.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.mapProvider.create({
        data: {
          name: input.name,
          kind: input.kind,
          urlTemplate: input.urlTemplate,
          attribution: input.attribution ?? null,
          minZoom: input.minZoom,
          maxZoom: input.maxZoom,
          tileSize: input.tileSize,
          subdomains: input.subdomains ?? undefined,
          requiresApiKey: input.requiresApiKey,
          secretReference: input.secretReference ?? null,
          isDefault: input.isDefault ?? false,
          isEnabled: input.isEnabled ?? true,
          createdById: actor.userId,
          updatedById: actor.userId,
        },
      });
    });

    const dto = toDTO(created);
    await logAudit({
      actorUserId: actor.userId,
      action: "map_provider.created",
      entityType: "MapProvider",
      entityId: created.id,
      afterJson: dto as unknown as Prisma.InputJsonValue,
    });

    return dto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("MAP_PROVIDER_DUPLICATE", "این نام قبلاً استفاده شده است.", {
        name: "این نام قبلاً استفاده شده است.",
      });
    }
    throw error;
  }
}

export async function updateMapProvider(
  id: string,
  input: MapProviderUpdateInput,
  actor: ActorContext,
): Promise<MapProviderDTO> {
  const existing = await prisma.mapProvider.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("MAP_PROVIDER_NOT_FOUND", "Provider نقشه یافت نشد.");
  }

  if (input.urlTemplate !== undefined) {
    assertValidUrl(input.urlTemplate, existing.kind);
  }
  if (input.minZoom !== undefined || input.maxZoom !== undefined) {
    const nextMin = input.minZoom ?? existing.minZoom;
    const nextMax = input.maxZoom ?? existing.maxZoom;
    if (nextMin > nextMax) {
      throw new DomainError(
        "MAP_PROVIDER_INVALID_ZOOM",
        "حداقل بزرگ‌نمایی باید کمتر یا مساوی حداکثر باشد.",
        { minZoom: "حداقل بزرگ‌نمایی باید کمتر یا مساوی حداکثر باشد." },
      );
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.mapProvider.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.mapProvider.update({
        where: { id },
        data: {
          name: input.name,
          urlTemplate: input.urlTemplate,
          attribution: input.attribution,
          minZoom: input.minZoom,
          maxZoom: input.maxZoom,
          tileSize: input.tileSize,
          subdomains: input.subdomains === null ? Prisma.JsonNull : input.subdomains,
          requiresApiKey: input.requiresApiKey,
          secretReference: input.secretReference,
          isDefault: input.isDefault,
          isEnabled: input.isEnabled,
          updatedById: actor.userId,
        },
      });
    });

    const afterDto = toDTO(updated);
    await logAudit({
      actorUserId: actor.userId,
      action: "map_provider.updated",
      entityType: "MapProvider",
      entityId: id,
      beforeJson: toDTO(existing) as unknown as Prisma.InputJsonValue,
      afterJson: afterDto as unknown as Prisma.InputJsonValue,
    });

    return afterDto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("MAP_PROVIDER_DUPLICATE", "این نام قبلاً استفاده شده است.", {
        name: "این نام قبلاً استفاده شده است.",
      });
    }
    throw error;
  }
}

export async function softDeleteMapProvider(id: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.mapProvider.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("MAP_PROVIDER_NOT_FOUND", "Provider نقشه یافت نشد.");
  }

  await prisma.mapProvider.update({
    where: { id },
    data: { deletedAt: new Date(), isEnabled: false, isDefault: false },
  });

  await logAudit({
    actorUserId: actor.userId,
    action: "map_provider.deleted",
    entityType: "MapProvider",
    entityId: id,
  });
}

const TEST_TIMEOUT_MS = 6000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB — کافی برای یک کاشی، مانع پاسخ‌های حجیم غیرمنتظره

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs: number | null;
  httpStatus: number | null;
}

function buildSampleTileUrl(urlTemplate: string, subdomains: string[] | null): string {
  let url = urlTemplate.replace("{z}", "0").replace("{x}", "0").replace("{y}", "0").replace("{reverseY}", "0");
  if (url.includes("{s}")) {
    const subdomain = subdomains && subdomains.length > 0 ? subdomains[0] : "a";
    url = url.replace("{s}", subdomain);
  }
  return url;
}

export async function testMapProviderConnection(
  id: string,
  actor: ActorContext,
): Promise<TestConnectionResult> {
  const provider = await prisma.mapProvider.findFirst({ where: { id, deletedAt: null } });
  if (!provider) {
    throw new DomainError("MAP_PROVIDER_NOT_FOUND", "Provider نقشه یافت نشد.");
  }

  const sampleUrl = buildSampleTileUrl(provider.urlTemplate, provider.subdomains as string[] | null);
  const result = await performConnectionTest(sampleUrl);

  const healthStatus: MapProviderHealthStatus = result.success ? "HEALTHY" : "UNHEALTHY";
  await prisma.mapProvider.update({
    where: { id },
    data: { healthStatus, lastCheckedAt: new Date() },
  });

  await logAudit({
    actorUserId: actor.userId,
    action: "map_provider.tested",
    entityType: "MapProvider",
    entityId: id,
    metadataJson: {
      success: result.success,
      httpStatus: result.httpStatus,
      latencyMs: result.latencyMs,
    } as Prisma.InputJsonValue,
  });

  return result;
}

async function performConnectionTest(sampleUrl: string): Promise<TestConnectionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(sampleUrl, {
      signal: controller.signal,
      redirect: "error", // از SSRF از طریق redirect به میزبان دیگر جلوگیری می‌کند
      headers: { "User-Agent": "Transportation-MapProvider-HealthCheck/1.0" },
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        success: false,
        message: `سرور نقشه پاسخ ناموفق داد (کد ${response.status}).`,
        latencyMs,
        httpStatus: response.status,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return {
        success: false,
        message: `پاسخ سرور از نوع کاشی تصویری نیست (Content-Type: ${contentType || "نامشخص"}).`,
        latencyMs,
        httpStatus: response.status,
      };
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_RESPONSE_BYTES) {
      return {
        success: false,
        message: "حجم پاسخ سرور بیش از حد مجاز است.",
        latencyMs,
        httpStatus: response.status,
      };
    }

    return { success: true, message: "اتصال به سرور نقشه موفق بود.", latencyMs, httpStatus: response.status };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, message: "زمان اتصال به سرور نقشه به پایان رسید (timeout).", latencyMs, httpStatus: null };
    }
    if (error instanceof TypeError && /redirect/i.test(error.message)) {
      return {
        success: false,
        message: "سرور نقشه تلاش برای redirect به آدرس دیگر داشت که به دلایل امنیتی رد شد.",
        latencyMs,
        httpStatus: null,
      };
    }
    return { success: false, message: "اتصال به سرور نقشه ناموفق بود.", latencyMs, httpStatus: null };
  } finally {
    clearTimeout(timeout);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
