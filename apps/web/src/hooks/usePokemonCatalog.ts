import { useQuery } from '@tanstack/react-query';
import { listPokemon, type ListPokemonInput } from '../api/pokemon';
import { useDebouncedValue } from './useDebouncedValue';

export function usePokemonCatalog(input: ListPokemonInput) {
  const debouncedSearch = useDebouncedValue(input.search ?? '', 300);
  return useQuery({
    queryKey: ['pokemon', input.page, input.limit, debouncedSearch],
    queryFn: () =>
      listPokemon({
        page: input.page,
        limit: input.limit,
        search: debouncedSearch || undefined,
      }),
    placeholderData: (prev) => prev,
  });
}
