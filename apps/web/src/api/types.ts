import type { PokemonSnapshot } from '@pokemon/shared';

export interface CatalogItem {
  id: number;
  name: string;
  weight: number;
  sprite: string;
  types: string[];
}

export interface CatalogPage {
  items: CatalogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListSummary {
  id: string;
  name: string;
  itemCount: number;
  totalWeight: number;
  createdAt: string;
}

export interface ListDetail {
  _id: string;
  name: string;
  items: PokemonSnapshot[];
  createdAt: string;
}

export interface ApiErrorEntry {
  code: string;
  message: string;
}

export interface ApiErrorEnvelope {
  statusCode: number;
  errors: ApiErrorEntry[];
}
