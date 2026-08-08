export interface ApiFieldError {
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
}

export class ApiError extends Error {
  /**
   * کد خطای دامنه، دست‌نخورده از سرور.
   *
   * از فاز ۱۵ نگه داشته می‌شود چون برخی خطاها نیازمند رفتار متفاوت‌اند، نه فقط پیام متفاوت:
   * `MISSION_VERSION_CONFLICT` باید دکمه «تازه‌سازی» نشان دهد (CC-06) و
   * `SHIPMENT_ALREADY_ASSIGNED` توضیح متفاوتی می‌خواهد. تطبیق روی *متن* پیام شکننده بود.
   */
  readonly code: string;
  readonly fieldErrors: Record<string, string>;

  constructor(payload: ApiFieldError) {
    super(payload.message);
    this.code = payload.code;
    this.fieldErrors = payload.fieldErrors;
  }
}
