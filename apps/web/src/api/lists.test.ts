import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import {
  listLists,
  getList,
  createList,
  deleteList,
  uploadList,
  downloadListUrl,
} from './lists';
import { sampleListDetail, sampleListSummary } from '../test/fixtures';

describe('lists api', () => {
  it('listLists returns summaries', async () => {
    const res = await listLists();
    expect(res).toEqual([sampleListSummary]);
  });

  it('getList returns a detail document', async () => {
    const res = await getList('64a000000000000000000001');
    expect(res).toEqual(sampleListDetail);
  });

  it('createList POSTs JSON and returns the created list', async () => {
    let received: unknown;
    server.use(
      http.post('/api/lists', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(sampleListDetail, { status: 201 });
      }),
    );
    const res = await createList({ name: 'x', pokemonIds: [1, 4, 7] });
    expect(received).toEqual({ name: 'x', pokemonIds: [1, 4, 7] });
    expect(res).toEqual(sampleListDetail);
  });

  it('deleteList resolves on 204', async () => {
    await expect(deleteList('abc')).resolves.toBeNull();
  });

  it('uploadList sends multipart and returns the created list', async () => {
    let contentType = '';
    server.use(
      http.post('/api/lists/upload', ({ request }) => {
        contentType = request.headers.get('content-type') ?? '';
        return HttpResponse.json(sampleListDetail, { status: 201 });
      }),
    );
    const file = new File(['{}'], 'team.json', { type: 'application/json' });
    const res = await uploadList(file);
    expect(contentType).toMatch(/multipart\/form-data/);
    expect(res).toEqual(sampleListDetail);
  });

  it('downloadListUrl yields the canonical download URL', () => {
    expect(downloadListUrl('xyz')).toBe('/api/lists/xyz/download');
  });
});
