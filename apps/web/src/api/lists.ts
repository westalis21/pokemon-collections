import { apiFetch } from './client';
import type { ListDetail, ListSummary } from './types';

export interface CreateListInput {
  name: string;
  pokemonIds: number[];
}

export function listLists(): Promise<ListSummary[]> {
  return apiFetch<ListSummary[]>('/api/lists');
}

export function getList(id: string): Promise<ListDetail> {
  return apiFetch<ListDetail>(`/api/lists/${id}`);
}

export function createList(input: CreateListInput): Promise<ListDetail> {
  return apiFetch<ListDetail>('/api/lists', {
    method: 'POST',
    json: input,
  });
}

export function deleteList(id: string): Promise<null> {
  return apiFetch<null>(`/api/lists/${id}`, { method: 'DELETE' });
}

export function uploadList(file: File): Promise<ListDetail> {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<ListDetail>('/api/lists/upload', {
    method: 'POST',
    body: form,
  });
}

export function downloadListUrl(id: string): string {
  return `/api/lists/${id}/download`;
}
