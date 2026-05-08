import { describe, it, expect } from 'vitest';
import { formatWeight, pluralize } from './format';

describe('format', () => {
  it('formatWeight converts hectograms to kg with one decimal', () => {
    expect(formatWeight(0)).toBe('0.0 kg');
    expect(formatWeight(60)).toBe('6.0 kg');
    expect(formatWeight(244)).toBe('24.4 kg');
    expect(formatWeight(1300)).toBe('130.0 kg');
  });

  it('pluralize uses the singular form for 1 and the plural otherwise', () => {
    expect(pluralize(1, 'species', 'species')).toBe('1 species');
    expect(pluralize(0, 'pokemon', 'pokemon')).toBe('0 pokemon');
    expect(pluralize(2, 'item', 'items')).toBe('2 items');
  });
});
