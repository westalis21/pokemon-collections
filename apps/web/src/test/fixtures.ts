import type { CatalogItem, CatalogPage, ListDetail, ListSummary } from '../api/types';

export const bulbasaur: CatalogItem = {
  id: 1,
  name: 'bulbasaur',
  weight: 69,
  sprite: 'https://example.test/sprites/1.png',
  types: ['grass', 'poison'],
};

export const charmander: CatalogItem = {
  id: 4,
  name: 'charmander',
  weight: 85,
  sprite: 'https://example.test/sprites/4.png',
  types: ['fire'],
};

export const squirtle: CatalogItem = {
  id: 7,
  name: 'squirtle',
  weight: 90,
  sprite: 'https://example.test/sprites/7.png',
  types: ['water'],
};

export const pikachu: CatalogItem = {
  id: 25,
  name: 'pikachu',
  weight: 60,
  sprite: 'https://example.test/sprites/25.png',
  types: ['electric'],
};

export const samplePage: CatalogPage = {
  items: [bulbasaur, charmander, squirtle, pikachu],
  total: 4,
  page: 1,
  limit: 20,
};

export const sampleListSummary: ListSummary = {
  id: '64a000000000000000000001',
  name: 'Starters',
  itemCount: 3,
  totalWeight: 244,
  createdAt: '2026-05-01T12:00:00.000Z',
};

export const sampleListDetail: ListDetail = {
  _id: '64a000000000000000000001',
  name: 'Starters',
  items: [
    { pokemonId: 1, name: 'bulbasaur', weight: 69, sprite: bulbasaur.sprite },
    { pokemonId: 4, name: 'charmander', weight: 85, sprite: charmander.sprite },
    { pokemonId: 7, name: 'squirtle', weight: 90, sprite: squirtle.sprite },
  ],
  createdAt: '2026-05-01T12:00:00.000Z',
};
