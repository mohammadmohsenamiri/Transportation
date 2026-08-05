import type { RoutePointInput } from "@/lib/validation/route";

export const MAX_ROUTE_POINTS = 10000;
export const MAX_CSV_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_REPORTED_ERRORS = 50;
const EXPECTED_HEADER = ["sequence", "latitude", "longitude", "label"];

export interface RouteCsvRowError {
  row: number;
  message: string;
}

export interface RouteCsvValidationResult {
  headerError: string | null;
  points: RoutePointInput[];
  rowErrors: RouteCsvRowError[];
  totalDataRows: number;
}

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const num = Number(value.trim());
  return Number.isFinite(num) ? num : null;
}

/**
 * اعتبارسنجی سطری فایل CSV مسیر طبق ADR-012 و PROJECT_SPEC بخش ۷.
 * تابع pure روی rows از parseCsv؛ ردیف اول header است.
 */
export function validateRouteCsvRows(rows: string[][]): RouteCsvValidationResult {
  if (rows.length === 0) {
    return { headerError: "فایل CSV خالی است.", points: [], rowErrors: [], totalDataRows: 0 };
  }

  const header = rows[0].map((cell) => cell.trim());
  const headerMatches =
    header.length === EXPECTED_HEADER.length && header.every((cell, i) => cell === EXPECTED_HEADER[i]);
  if (!headerMatches) {
    return {
      headerError: `سرستون فایل باید دقیقاً «${EXPECTED_HEADER.join(",")}» باشد.`,
      points: [],
      rowErrors: [],
      totalDataRows: rows.length - 1,
    };
  }

  const dataRows = rows.slice(1);
  const rowErrors: RouteCsvRowError[] = [];
  const parsed: (RoutePointInput & { rowNumber: number })[] = [];

  function addError(rowNumber: number, message: string) {
    if (rowErrors.length < MAX_REPORTED_ERRORS) {
      rowErrors.push({ row: rowNumber, message });
    }
  }

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 2; // ردیف ۱ = header
    if (cells.length !== 4) {
      addError(rowNumber, "تعداد ستون‌ها باید دقیقاً ۴ باشد (sequence,latitude,longitude,label).");
      return;
    }

    const [sequenceRaw, latitudeRaw, longitudeRaw, labelRaw] = cells;
    const sequence = parseNumber(sequenceRaw);
    if (sequence === null || !Number.isInteger(sequence) || sequence <= 0) {
      addError(rowNumber, "ترتیب (sequence) باید عدد صحیح مثبت باشد.");
      return;
    }

    const latitude = parseNumber(latitudeRaw);
    if (latitude === null || latitude < -90 || latitude > 90) {
      addError(rowNumber, "عرض جغرافیایی باید عددی بین -۹۰ و ۹۰ باشد.");
      return;
    }

    const longitude = parseNumber(longitudeRaw);
    if (longitude === null || longitude < -180 || longitude > 180) {
      addError(rowNumber, "طول جغرافیایی باید عددی بین -۱۸۰ و ۱۸۰ باشد.");
      return;
    }

    const label = labelRaw.trim() === "" ? null : labelRaw.trim();
    parsed.push({ sequence, latitude, longitude, label, rowNumber });
  });

  if (parsed.length > MAX_ROUTE_POINTS) {
    addError(0, `تعداد نقاط نباید بیش از ${MAX_ROUTE_POINTS.toLocaleString("fa-IR")} باشد.`);
  }

  const seenSequences = new Map<number, number>();
  for (const point of parsed) {
    const firstRow = seenSequences.get(point.sequence);
    if (firstRow !== undefined) {
      addError(point.rowNumber, `ترتیب تکراری: مقدار ${point.sequence} قبلاً در ردیف ${firstRow} استفاده شده است.`);
    } else {
      seenSequences.set(point.sequence, point.rowNumber);
    }
  }

  const sorted = [...parsed].sort((a, b) => a.sequence - b.sequence);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.latitude === curr.latitude && prev.longitude === curr.longitude) {
      addError(curr.rowNumber, "نقطه تکراری متوالی: مختصات با نقطه قبلی یکسان است.");
    }
  }

  if (rowErrors.length === 0 && sorted.length < 2) {
    addError(0, "مسیر باید حداقل دو نقطه معتبر داشته باشد.");
  }

  const points: RoutePointInput[] = sorted.map((point) => ({
    sequence: point.sequence,
    latitude: point.latitude,
    longitude: point.longitude,
    label: point.label,
  }));

  return { headerError: null, points, rowErrors, totalDataRows: dataRows.length };
}
