import { useQuery } from '@tanstack/react-query';
import { listLists } from '../api/lists';

export const listsQueryKey = ['lists'] as const;

export function useLists() {
  return useQuery({
    queryKey: listsQueryKey,
    queryFn: listLists,
  });
}
