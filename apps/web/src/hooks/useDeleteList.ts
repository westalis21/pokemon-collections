import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteList } from '../api/lists';
import { listsQueryKey } from './useLists';

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteList(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listsQueryKey });
    },
  });
}
