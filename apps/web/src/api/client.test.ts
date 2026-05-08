import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { apiFetch } from './client';
import { ApiError } from '../lib/api-error';

describe('apiFetch', () => {
  it('returns parsed JSON on 2xx', async () => {
    server.use(
      http.get('/api/echo', () => HttpResponse.json({ hello: 'world' })),
    );
    const result = await apiFetch<{ hello: string }>('/api/echo');
    expect(result).toEqual({ hello: 'world' });
  });

  it('returns null on 204', async () => {
    server.use(
      http.delete('/api/thing/:id', () => new HttpResponse(null, { status: 204 })),
    );
    const result = await apiFetch<null>('/api/thing/42', { method: 'DELETE' });
    expect(result).toBeNull();
  });

  it('throws ApiError on non-2xx with envelope', async () => {
    server.use(
      http.post('/api/lists', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            errors: [{ code: 'MIN_SPECIES', message: 'need 3' }],
          },
          { status: 400 },
        ),
      ),
    );
    await expect(
      apiFetch('/api/lists', { method: 'POST', body: JSON.stringify({}) }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('serialises a JSON body and sets Content-Type when given a plain object', async () => {
    let received: unknown;
    server.use(
      http.post('/api/echo', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/api/echo', {
      method: 'POST',
      json: { name: 'x', pokemonIds: [1, 2, 3] },
    });
    expect(received).toEqual({ name: 'x', pokemonIds: [1, 2, 3] });
  });
});
