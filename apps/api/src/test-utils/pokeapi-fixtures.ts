import type { PokeDetail, PokeIndexEntry } from '../pokemon/poke-api.client';

export const indexFixture: PokeIndexEntry[] = [
  { id: 1, name: 'bulbasaur' },
  { id: 4, name: 'charmander' },
  { id: 7, name: 'squirtle' },
  { id: 25, name: 'pikachu' },
];

export const detailFixtures: Record<string, PokeDetail> = {
  '1': { id: 1, name: 'bulbasaur', weight: 69, sprite: 'b.png', types: ['grass'] },
  '4': { id: 4, name: 'charmander', weight: 85, sprite: 'c.png', types: ['fire'] },
  '7': { id: 7, name: 'squirtle', weight: 90, sprite: 's.png', types: ['water'] },
  '25': { id: 25, name: 'pikachu', weight: 60, sprite: 'p.png', types: ['electric'] },
};

export const fakePokeApiClient = () => ({
  fetchIndex: jest.fn().mockResolvedValue(indexFixture),
  fetchOne: jest.fn().mockImplementation(async (key: number | string) => {
    const detail = detailFixtures[String(key)];
    if (!detail) throw new Error(`No fixture for ${key}`);
    return detail;
  }),
});
