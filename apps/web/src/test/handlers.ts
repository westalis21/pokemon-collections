import { http, HttpResponse } from 'msw';
import {
  bulbasaur,
  charmander,
  pikachu,
  sampleListDetail,
  sampleListSummary,
  samplePage,
  squirtle,
} from './fixtures';

export const defaultHandlers = [
  http.get('/api/pokemon', ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const all = [bulbasaur, charmander, squirtle, pikachu];
    const filtered = search
      ? all.filter((p) => p.name.includes(search))
      : all;
    return HttpResponse.json({
      items: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
    });
  }),

  http.get('/api/pokemon/:idOrName', ({ params }) => {
    const idOrName = String(params.idOrName);
    const all = [bulbasaur, charmander, squirtle, pikachu];
    const found =
      all.find((p) => String(p.id) === idOrName) ??
      all.find((p) => p.name === idOrName);
    if (!found) {
      return HttpResponse.json(
        { statusCode: 404, errors: [{ code: 'NOT_FOUND', message: 'Not found.' }] },
        { status: 404 },
      );
    }
    return HttpResponse.json(found);
  }),

  http.get('/api/lists', () => HttpResponse.json([sampleListSummary])),

  http.get('/api/lists/:id', () => HttpResponse.json(sampleListDetail)),

  http.post('/api/lists', async ({ request }) => {
    const body = (await request.json()) as { name: string; pokemonIds: number[] };
    return HttpResponse.json(
      {
        _id: 'new-list-id',
        name: body.name,
        items: samplePage.items
          .filter((p) => body.pokemonIds.includes(p.id))
          .map((p) => ({
            pokemonId: p.id,
            name: p.name,
            weight: p.weight,
            sprite: p.sprite,
          })),
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  http.delete('/api/lists/:id', () => new HttpResponse(null, { status: 204 })),

  http.post('/api/lists/upload', () =>
    HttpResponse.json(sampleListDetail, { status: 201 }),
  ),
];
