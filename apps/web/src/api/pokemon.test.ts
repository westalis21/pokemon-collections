import { describe, it, expect } from 'vitest';
import { listPokemon, getPokemon } from './pokemon';
import { bulbasaur } from '../test/fixtures';

describe('pokemon api', () => {
  it('fetches catalog with query params', async () => {
    const page = await listPokemon({ page: 1, limit: 20, search: 'bulb' });
    expect(page.items[0]?.name).toBe('bulbasaur');
    expect(page.total).toBeGreaterThanOrEqual(1);
  });

  it('fetches a single pokemon by id', async () => {
    const p = await getPokemon(1);
    expect(p).toEqual(bulbasaur);
  });
});
