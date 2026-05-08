import { describe, it, expect } from 'vitest';
import { ListFileCodec } from './list-file.codec';

describe('ListFileCodec', () => {
  describe('encode', () => {
    it('produces a v1 file with name and items', () => {
      const json = ListFileCodec.encode({
        name: 'My team',
        items: [{ pokemonId: 25, name: 'pikachu', weight: 60 }],
      });
      expect(JSON.parse(json)).toEqual({
        schemaVersion: 1,
        name: 'My team',
        items: [{ pokemonId: 25, name: 'pikachu', weight: 60 }],
      });
    });

    it('strips fields outside the v1 item shape', () => {
      const json = ListFileCodec.encode({
        name: 'My team',
        items: [
          {
            pokemonId: 25,
            name: 'pikachu',
            weight: 60,
            sprite: 'ignored.png',
          } as unknown as { pokemonId: number; name: string; weight: number },
        ],
      });
      expect(JSON.parse(json).items[0]).toEqual({
        pokemonId: 25,
        name: 'pikachu',
        weight: 60,
      });
    });
  });

  describe('decode', () => {
    it('round-trips a v1 file', () => {
      const json = ListFileCodec.encode({
        name: 'My team',
        items: [
          { pokemonId: 25, name: 'pikachu', weight: 60 },
          { pokemonId: 1, name: 'bulbasaur', weight: 69 },
          { pokemonId: 4, name: 'charmander', weight: 85 },
        ],
      });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schemaVersion).toBe(1);
        expect(result.value.name).toBe('My team');
        expect(result.value.items).toHaveLength(3);
      }
    });

    it('rejects malformed JSON with INVALID_FILE_FORMAT', () => {
      const result = ListFileCodec.decode('not json');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_FILE_FORMAT');
    });

    it('rejects unknown schemaVersion with UNSUPPORTED_FILE_VERSION', () => {
      const json = JSON.stringify({ schemaVersion: 99, name: 'x', items: [] });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.error.code).toBe('UNSUPPORTED_FILE_VERSION');
    });

    it('rejects missing schemaVersion with INVALID_FILE_FORMAT', () => {
      const json = JSON.stringify({ name: 'x', items: [] });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_FILE_FORMAT');
    });

    it('rejects missing required body fields with INVALID_FILE_FORMAT', () => {
      const json = JSON.stringify({ schemaVersion: 1, items: [] });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_FILE_FORMAT');
    });

    it('rejects items with wrong field types with INVALID_FILE_FORMAT', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        name: 'x',
        items: [{ pokemonId: 'abc', name: 'pikachu', weight: 60 }],
      });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_FILE_FORMAT');
    });
  });
});
