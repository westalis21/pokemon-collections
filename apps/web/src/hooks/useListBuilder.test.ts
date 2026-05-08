import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useListBuilder } from './useListBuilder';
import { bulbasaur, charmander, squirtle } from '../test/fixtures';

describe('useListBuilder', () => {
  it('starts with an empty selection and an invalid validator state', () => {
    const { result } = renderHook(() => useListBuilder());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalWeight).toBe(0);
    expect(result.current.uniqueSpecies).toBe(0);
    expect(result.current.validation.ok).toBe(false);
  });

  it('toggles items in and out of the selection', () => {
    const { result } = renderHook(() => useListBuilder());
    act(() => result.current.toggle(bulbasaur));
    expect(result.current.items).toHaveLength(1);
    act(() => result.current.toggle(bulbasaur));
    expect(result.current.items).toHaveLength(0);
  });

  it('isSelected reflects the current selection', () => {
    const { result } = renderHook(() => useListBuilder());
    expect(result.current.isSelected(1)).toBe(false);
    act(() => result.current.toggle(bulbasaur));
    expect(result.current.isSelected(1)).toBe(true);
  });

  it('reaches a valid state once 3 unique species under 1300hg are picked', () => {
    const { result } = renderHook(() => useListBuilder());
    act(() => {
      result.current.toggle(bulbasaur);
      result.current.toggle(charmander);
      result.current.toggle(squirtle);
    });
    expect(result.current.uniqueSpecies).toBe(3);
    expect(result.current.totalWeight).toBe(244);
    expect(result.current.validation.ok).toBe(true);
  });

  it('flags WEIGHT_EXCEEDED when total > 1300', () => {
    const heavy = { ...bulbasaur, id: 99, name: 'snorlax', weight: 5000 };
    const { result } = renderHook(() => useListBuilder());
    act(() => {
      result.current.toggle(heavy);
      result.current.toggle({ ...heavy, id: 100, name: 'wailord' });
      result.current.toggle({ ...heavy, id: 101, name: 'mudsdale' });
    });
    expect(result.current.validation.ok).toBe(false);
    if (!result.current.validation.ok) {
      expect(
        result.current.validation.errors.map((e) => e.code),
      ).toContain('WEIGHT_EXCEEDED');
    }
  });

  it('setFromFile replaces the entire selection', () => {
    const { result } = renderHook(() => useListBuilder());
    act(() => result.current.toggle(bulbasaur));
    act(() =>
      result.current.setFromFile({
        name: 'Imported',
        items: [
          { pokemonId: 4, name: 'charmander', weight: 85 },
          { pokemonId: 7, name: 'squirtle', weight: 90 },
        ],
      }),
    );
    expect(result.current.items.map((i) => i.pokemonId)).toEqual([4, 7]);
    expect(result.current.name).toBe('Imported');
  });

  it('clear resets selection and name', () => {
    const { result } = renderHook(() => useListBuilder());
    act(() => {
      result.current.setName('My team');
      result.current.toggle(bulbasaur);
    });
    act(() => result.current.clear());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.name).toBe('');
  });
});
