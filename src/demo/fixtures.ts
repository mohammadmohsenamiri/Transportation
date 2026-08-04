/**
 * پیش‌نمایش رابط — Preview UI fixture data.
 *
 * این فایل فقط داده ثابت نمایشی برای Phase 0 (پیش‌نمایش قابل کلیک) است.
 * هیچ اتصال به پایگاه‌داده یا API واقعی ندارد و نباید در فازهای بعد به‌عنوان
 * منبع داده واقعی استفاده شود.
 */

export const PREVIEW_DATA_LABEL = "پیش‌نمایش رابط" as const;

export type KpiTone = "primary" | "success" | "warning" | "danger" | "purple" | "info";

export interface KpiFixture {
  id: string;
  label: string;
  value: string;
  deltaLabel: string;
  deltaDirection: "up" | "down";
  tone: KpiTone;
  icon: "truck" | "package" | "mission" | "ready" | "clock" | "alert";
}

export const overviewKpis: KpiFixture[] = [
  { id: "waiting-shipments", label: "مرسوله‌های در انتظار ارسال", value: "۵۶", deltaLabel: "۷٪", deltaDirection: "down", tone: "warning", icon: "clock" },
  { id: "missions-in-progress", label: "مأموریت‌های در حرکت", value: "۸۷", deltaLabel: "۵٪", deltaDirection: "up", tone: "primary", icon: "truck" },
  { id: "missions-completed", label: "مأموریت‌های پایان‌یافته", value: "۲۰۴", deltaLabel: "۱۸٪", deltaDirection: "up", tone: "success", icon: "mission" },
  { id: "missions-total", label: "کل مأموریت‌ها", value: "۳۲۵", deltaLabel: "۱۵٪", deltaDirection: "up", tone: "purple", icon: "mission" },
  { id: "vehicles-ready", label: "خودروهای آماده", value: "۱۵۶", deltaLabel: "۱۲٪", deltaDirection: "up", tone: "success", icon: "ready" },
  { id: "vehicles-total", label: "کل خودروها", value: "۲۴۸", deltaLabel: "۸٪", deltaDirection: "up", tone: "info", icon: "truck" },
];

export const mapKpis: KpiFixture[] = [
  { id: "vehicles-ready", label: "خودروهای آماده", value: "۳۸", deltaLabel: "از ۷۲ خودرو", deltaDirection: "up", tone: "success", icon: "ready" },
  { id: "missions-arrived", label: "مأموریت‌های رسیده", value: "۱۱۴", deltaLabel: "۱۸٪", deltaDirection: "up", tone: "info", icon: "mission" },
  { id: "missions-active", label: "مأموریت‌های فعال", value: "۲۴۸", deltaLabel: "۷٪", deltaDirection: "up", tone: "primary", icon: "truck" },
  { id: "delays", label: "تأخیرهای احتمالی", value: "۱۷", deltaLabel: "نیاز به پیگیری", deltaDirection: "up", tone: "danger", icon: "alert" },
];

export interface DonutSegmentFixture {
  id: string;
  label: string;
  value: number;
  percentLabel: string;
  tone: KpiTone;
}

export const missionStatusBreakdown: DonutSegmentFixture[] = [
  { id: "arrived", label: "پایان‌یافته", value: 204, percentLabel: "۶۲.۸٪", tone: "success" },
  { id: "in-progress", label: "در حال حرکت", value: 87, percentLabel: "۲۶.۸٪", tone: "primary" },
  { id: "scheduled", label: "برنامه‌ریزی‌شده", value: 23, percentLabel: "۷.۱٪", tone: "warning" },
  { id: "cancelled", label: "لغو شده", value: 11, percentLabel: "۳.۳٪", tone: "danger" },
];

export const vehicleReadinessBreakdown: DonutSegmentFixture[] = [
  { id: "ready", label: "آماده", value: 156, percentLabel: "۶۲.۹٪", tone: "success" },
  { id: "in-mission", label: "در مأموریت", value: 71, percentLabel: "۲۸.۶٪", tone: "primary" },
  { id: "maintenance", label: "تعمیر و نگهداری", value: 15, percentLabel: "۶.۰٪", tone: "warning" },
  { id: "out-of-service", label: "غیرفعال", value: 6, percentLabel: "۲.۴٪", tone: "danger" },
];

export type DisplayMissionStatus = "WAITING" | "IN_PROGRESS" | "ARRIVED" | "CANCELLED";

export const missionStatusLabel: Record<DisplayMissionStatus, string> = {
  WAITING: "برنامه‌ریزی‌شده",
  IN_PROGRESS: "در حال حرکت",
  ARRIVED: "پایان‌یافته",
  CANCELLED: "لغو شده",
};

export interface MissionRowFixture {
  id: string;
  code: string;
  origin: string;
  destination: string;
  vehicleType: string;
  driver: string;
  status: DisplayMissionStatus;
  progress: number;
  startAt: string;
  eta: string;
}

export const recentMissions: MissionRowFixture[] = [
  { id: "m-1234", code: "۱۲۳۴", origin: "تهران", destination: "اصفهان", vehicleType: "کامیون", driver: "علی محمدی", status: "ARRIVED", progress: 100, startAt: "۱۴۰۴/۰۲/۲۴ ۰۹:۱۵", eta: "۱۴۰۴/۰۲/۲۴ ۰۹:۱۵" },
  { id: "m-1235", code: "۱۲۳۵", origin: "تهران", destination: "مشهد", vehicleType: "تک", driver: "رضا کریمی", status: "IN_PROGRESS", progress: 65, startAt: "۱۴۰۴/۰۲/۲۴ ۰۸:۳۰", eta: "۱۴۰۴/۰۲/۲۴ ۱۴:۱۵" },
  { id: "m-1236", code: "۱۲۳۶", origin: "تبریز", destination: "شیراز", vehicleType: "تریلی", driver: "حسین قربانی", status: "WAITING", progress: 0, startAt: "۱۴۰۴/۰۲/۲۴ ۱۱:۰۰", eta: "۱۴۰۴/۰۲/۲۴ ۱۸:۴۰" },
  { id: "m-1237", code: "۱۲۳۷", origin: "بندرعباس", destination: "تبریز", vehicleType: "کامیون", driver: "سعید رستمی", status: "IN_PROGRESS", progress: 42, startAt: "۱۴۰۴/۰۲/۲۴ ۰۷:۴۵", eta: "۱۴۰۴/۰۲/۲۴ ۱۷:۱۰" },
  { id: "m-1238", code: "۱۲۳۸", origin: "یزد", destination: "بندرعباس", vehicleType: "تریلی یخچال‌دار", driver: "مهدی لطفی", status: "IN_PROGRESS", progress: 78, startAt: "۱۴۰۴/۰۲/۲۴ ۰۶:۲۰", eta: "۱۴۰۴/۰۲/۲۴ ۱۵:۰۰" },
];

export const activeMissionsTable: MissionRowFixture[] = [
  { id: "m-0578", code: "M-1404-0578", origin: "تهران", destination: "مشهد", vehicleType: "کامیونت ۶ تن", driver: "علی محمدی", status: "IN_PROGRESS", progress: 62, startAt: "۰۷:۴۵", eta: "۱۴:۱۵" },
  { id: "m-0579", code: "M-1404-0579", origin: "اصفهان", destination: "شیراز", vehicleType: "کامیون ۱۰ تن", driver: "رضا کریمی", status: "IN_PROGRESS", progress: 48, startAt: "۰۸:۱۰", eta: "۱۵:۴۰" },
  { id: "m-0580", code: "M-1404-0580", origin: "تهران", destination: "بندرعباس", vehicleType: "تریلی کفی", driver: "حسین قربانی", status: "IN_PROGRESS", progress: 85, startAt: "۰۵:۳۰", eta: "۱۳:۲۰" },
  { id: "m-0581", code: "M-1404-0581", origin: "تبریز", destination: "رشت", vehicleType: "کامیونت ۶ تن", driver: "سعید رستمی", status: "WAITING", progress: 22, startAt: "۱۰:۰۰", eta: "۱۶:۵۰" },
  { id: "m-0582", code: "M-1404-0582", origin: "تهران", destination: "قم", vehicleType: "کامیون ۱۰ تن", driver: "مهدی لطفی", status: "ARRIVED", progress: 100, startAt: "۰۶:۰۰", eta: "۰۸:۳۰" },
  { id: "m-0583", code: "M-1404-0583", origin: "کرمان", destination: "یزد", vehicleType: "کامیونت ۶ تن", driver: "مهدی احمدی", status: "IN_PROGRESS", progress: 55, startAt: "۰۷:۱۰", eta: "۱۲:۴۰" },
  { id: "m-0584", code: "M-1404-0584", origin: "مشهد", destination: "سرخس", vehicleType: "تریلی بارگیردار", driver: "امیر صادقی", status: "WAITING", progress: 15, startAt: "۱۱:۲۰", eta: "۱۳:۵۰" },
];

export interface ActivityFixture {
  id: string;
  time: string;
  text: string;
  tone: KpiTone;
}

export const recentActivities: ActivityFixture[] = [
  { id: "a-1", time: "۱۰:۲۵", text: "مأموریت ۱۲۳۴ پایان یافت (تهران، اصفهان)", tone: "success" },
  { id: "a-2", time: "۱۰:۱۰", text: "خودروی ۵۴۷ کد وارد مأموریت شد", tone: "primary" },
  { id: "a-3", time: "۰۹:۵۵", text: "مرسوله جدید ثبت شد (کد ۸۷۷۴)", tone: "purple" },
  { id: "a-4", time: "۰۹:۴۲", text: "تأخیر در مأموریت ۱۲۳۱، علت: ترافیک سنگین", tone: "warning" },
  { id: "a-5", time: "۰۹:۳۰", text: "مسیر جدید ایجاد شد (تهران - بندرعباس)", tone: "info" },
];

export interface DemoVehicleMarker {
  id: string;
  label: string;
  city: string;
  leftPercent: number;
  topPercent: number;
  status: DisplayMissionStatus;
}

export const demoVehicleMarkers: DemoVehicleMarker[] = [
  { id: "v-2857", label: "۲۸۵۷", city: "مشهد", leftPercent: 66, topPercent: 22, status: "IN_PROGRESS" },
  { id: "v-1190", label: "۱۱۹۰", city: "تهران", leftPercent: 44, topPercent: 34, status: "IN_PROGRESS" },
  { id: "v-3342", label: "۳۳۴۲", city: "اصفهان", leftPercent: 40, topPercent: 52, status: "WAITING" },
  { id: "v-4471", label: "۴۴۷۱", city: "اهواز", leftPercent: 24, topPercent: 62, status: "IN_PROGRESS" },
  { id: "v-5820", label: "۵۸۲۰", city: "بندرعباس", leftPercent: 47, topPercent: 74, status: "ARRIVED" },
  { id: "v-6103", label: "۶۱۰۳", city: "شیراز", leftPercent: 40, topPercent: 66, status: "IN_PROGRESS" },
];

export const selectedMissionDetail = {
  vehicleLabel: "خودرو ۲۸۵۷",
  status: "IN_PROGRESS" as DisplayMissionStatus,
  origin: "تهران",
  destination: "مشهد",
  progress: 62,
  remaining: "۳ ساعت و ۲۵ دقیقه",
  startAt: "امروز، ۰۷:۴۵",
  eta: "امروز، ۱۴:۱۵",
  vehicleType: "کامیونت ۶ تن",
};

export const timeSeekerHours = ["۰۰:۰۰", "۰۴:۰۰", "۰۸:۰۰", "۱۲:۰۰", "۱۶:۰۰", "۲۰:۰۰", "۲۴:۰۰"];
export const timeSeekerCurrentLabel = "۱۰:۳۰";
export const timeSeekerCurrentPercent = 44;
