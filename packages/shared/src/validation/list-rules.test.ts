import { describe, it, expect } from 'vitest';
import { ListValidator } from './list-rules';

const item = (pokemonId: number, weight: number) => ({ pokemonId, weight });

describe('ListValidator', () => {
  it('rejects an empty list with MIN_SPECIES', () => {
    const result = ListValidator.validate([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.code)).toContain('MIN_SPECIES');
    }
  });

  it('rejects a list with two unique species', () => {
    const result = ListValidator.validate([item(1, 100), item(2, 100)]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe('MIN_SPECIES');
  });

  it('rejects three duplicates of the same species with MIN_SPECIES', () => {
    const result = ListValidator.validate([
      item(1, 100),
      item(1, 100),
      item(1, 100),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe('MIN_SPECIES');
  });

  it('accepts a list at exactly the weight limit (1300)', () => {
    const result = ListValidator.validate([
      item(1, 400),
      item(2, 400),
      item(3, 500),
    ]);
    expect(result).toEqual({ ok: true });
  });

  it('rejects a list that exceeds the weight limit by 1', () => {
    const result = ListValidator.validate([
      item(1, 400),
      item(2, 400),
      item(3, 501),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe('WEIGHT_EXCEEDED');
  });

  it('returns both errors when both rules fail simultaneously', () => {
    const result = ListValidator.validate([item(1, 2000)]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((e) => e.code).sort();
      expect(codes).toEqual(['MIN_SPECIES', 'WEIGHT_EXCEEDED']);
    }
  });

  it('accepts a minimal valid list (3 unique species under weight)', () => {
    const result = ListValidator.validate([
      item(1, 100),
      item(2, 100),
      item(3, 100),
    ]);
    expect(result).toEqual({ ok: true });
  });
});
