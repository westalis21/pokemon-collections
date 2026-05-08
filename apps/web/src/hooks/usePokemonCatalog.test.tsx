import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '../test/render';
import { usePokemonCatalog } from './usePokemonCatalog';

function wrapper() {
  const client = makeQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('usePokemonCatalog', () => {
  it('debounces the search term and returns a page', async () => {
    const { result } = renderHook(
      () => usePokemonCatalog({ page: 1, limit: 20, search: 'bulb' }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0]?.name).toBe('bulbasaur');
  });
});
