import { PokeApiClient } from './poke-api.client';

const ok = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: async () => body } as Response);
const fail = (status: number) =>
  Promise.resolve({
    ok: false,
    status,
    json: async () => ({}),
    statusText: 'err',
  } as Response);

describe('PokeApiClient', () => {
  let fetchMock: jest.SpyInstance;
  let client: PokeApiClient;

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    client = new PokeApiClient();
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('fetchIndex', () => {
    it('maps /pokemon list responses to { id, name } pairs', async () => {
      fetchMock.mockReturnValueOnce(
        ok({
          results: [
            { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
            { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
          ],
        }),
      );

      const result = await client.fetchIndex(2);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://pokeapi.co/api/v2/pokemon?limit=2',
      );
      expect(result).toEqual([
        { id: 1, name: 'bulbasaur' },
        { id: 25, name: 'pikachu' },
      ]);
    });

    it('throws when the index response is not ok', async () => {
      fetchMock.mockReturnValueOnce(fail(500));
      await expect(client.fetchIndex(10)).rejects.toThrow(
        /PokeAPI index failed/i,
      );
    });
  });

  describe('fetchOne', () => {
    it('maps detail payloads to the snapshot shape', async () => {
      fetchMock.mockReturnValueOnce(
        ok({
          id: 25,
          name: 'pikachu',
          weight: 60,
          sprites: { front_default: 'https://img/25.png' },
          types: [
            { slot: 1, type: { name: 'electric' } },
          ],
        }),
      );

      const result = await client.fetchOne('25');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://pokeapi.co/api/v2/pokemon/25',
      );
      expect(result).toEqual({
        id: 25,
        name: 'pikachu',
        weight: 60,
        sprite: 'https://img/25.png',
        types: ['electric'],
      });
    });

    it('falls back to empty sprite if missing', async () => {
      fetchMock.mockReturnValueOnce(
        ok({
          id: 1,
          name: 'bulbasaur',
          weight: 69,
          sprites: { front_default: null },
          types: [],
        }),
      );

      const result = await client.fetchOne(1);
      expect(result.sprite).toBe('');
    });

    it('throws on a 404 with the requested key in the message', async () => {
      fetchMock.mockReturnValueOnce(fail(404));
      await expect(client.fetchOne('missingno')).rejects.toThrow(
        /missingno/,
      );
    });
  });
});
