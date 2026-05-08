import { useQuery } from '@tanstack/react-query';
import { getList } from '../api/lists';

export function useList(id: string | undefined) {
  return useQuery({
    queryKey: ['list', id],
    queryFn: () => getList(id as string),
    enabled: Boolean(id),
  });
}
