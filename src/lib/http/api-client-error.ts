export interface ApiFieldError {
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
}

export class ApiError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(payload: ApiFieldError) {
    super(payload.message);
    this.fieldErrors = payload.fieldErrors;
  }
}
