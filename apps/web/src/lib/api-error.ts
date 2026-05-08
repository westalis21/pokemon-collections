import type { ApiErrorEntry, ApiErrorEnvelope } from '../api/types';

export class ApiError extends Error {
  readonly status: number;
  readonly errors: ApiErrorEntry[];

  constructor(status: number, errors: ApiErrorEntry[]) {
    const head = errors[0];
    super(head ? head.message : `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  get firstCode(): string {
    return this.errors[0]?.code ?? 'INTERNAL_ERROR';
  }
}

function isEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.errors);
}

export function parseApiError(status: number, payload: unknown): ApiError {
  if (isEnvelope(payload)) {
    return new ApiError(status, payload.errors);
  }
  const message =
    typeof payload === 'string' && payload
      ? payload
      : status >= 500
        ? 'Unexpected server error.'
        : 'Request failed.';
  return new ApiError(status, [{ code: 'INTERNAL_ERROR', message }]);
}
