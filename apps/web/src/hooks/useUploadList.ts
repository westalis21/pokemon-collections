import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadList } from '../api/lists';
import { listsQueryKey } from './useLists';

export function useUploadList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadList(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listsQueryKey });
    },
  });
}
