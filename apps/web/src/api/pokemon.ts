import { apiFetch } from './client';
import type { CatalogItem, CatalogPage } from './types';

export interface ListPokemonInput {
  page?: number;
  limit?: number;
  search?: string;
}

export function listPokemon(input: ListPokemonInput = {}): Promise<CatalogPage> {
  const params = new URLSearchParams();
  if (input.page !== undefined) params.set('page', String(input.page));
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.search) params.set('search', input.search);
  const qs = params.toString();
  return apiFetch<CatalogPage>(`/api/pokemon${qs ? `?${qs}` : ''}`);
}

export function getPokemon(idOrName: number | string): Promise<CatalogItem> {
  return apiFetch<CatalogItem>(`/api/pokemon/${idOrName}`);
}
