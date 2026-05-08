import { describe, it, expect } from 'vitest';
import { ApiError, parseApiError } from './api-error';

describe('ApiError', () => {
  it('is throwable and exposes status + errors', () => {
    const err = new ApiError(400, [
      { code: 'MIN_SPECIES', message: 'too few species' },
    ]);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.errors).toHaveLength(1);
    expect(err.firstCode).toBe('MIN_SPECIES');
    expect(err.message).toMatch(/too few species/);
  });

  it('parseApiError extracts a typed error from a fetch response payload', async () => {
    const envelope = {
      statusCode: 400,
      errors: [
        { code: 'MIN_SPECIES', message: 'a' },
        { code: 'WEIGHT_EXCEEDED', message: 'b' },
      ],
    };
    const err = parseApiError(400, envelope);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.errors.map((e) => e.code)).toEqual([
      'MIN_SPECIES',
      'WEIGHT_EXCEEDED',
    ]);
  });

  it('parseApiError falls back when payload is not the expected shape', () => {
    const err = parseApiError(500, 'kaboom');
    expect(err.status).toBe(500);
    expect(err.firstCode).toBe('INTERNAL_ERROR');
    expect(err.message).toMatch(/kaboom|unexpected/i);
  });

  it('parseApiError handles a missing payload', () => {
    const err = parseApiError(502, undefined);
    expect(err.status).toBe(502);
    expect(err.firstCode).toBe('INTERNAL_ERROR');
  });
});
