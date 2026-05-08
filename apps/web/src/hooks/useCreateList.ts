import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createList, type CreateListInput } from '../api/lists';
import { listsQueryKey } from './useLists';

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateListInput) => createList(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listsQueryKey });
    },
  });
}
