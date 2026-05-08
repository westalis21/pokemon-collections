import { Injectable } from '@nestjs/common';

const BASE = 'https://pokeapi.co/api/v2';

export interface PokeIndexEntry {
  id: number;
  name: string;
}

export interface PokeDetail {
  id: number;
  name: string;
  weight: number;
  sprite: string;
  types: string[];
}

interface PokeApiIndexResponse {
  results: { name: string; url: string }[];
}

interface PokeApiDetailResponse {
  id: number;
  name: string;
  weight: number;
  sprites?: { front_default?: string | null };
  types?: { type: { name: string } }[];
}

@Injectable()
export class PokeApiClient {
  async fetchIndex(limit: number): Promise<PokeIndexEntry[]> {
    const response = await fetch(`${BASE}/pokemon?limit=${limit}`);
    if (!response.ok) {
      throw new Error(
        `PokeAPI index failed: ${response.status} ${response.statusText}`,
      );
    }
    const body = (await response.json()) as PokeApiIndexResponse;
    return body.results.map((entry) => ({
      id: this.idFromUrl(entry.url),
      name: entry.name,
    }));
  }

  async fetchOne(idOrName: number | string): Promise<PokeDetail> {
    const response = await fetch(`${BASE}/pokemon/${idOrName}`);
    if (!response.ok) {
      throw new Error(
        `PokeAPI detail failed for "${idOrName}": ${response.status}`,
      );
    }
    const body = (await response.json()) as PokeApiDetailResponse;
    return {
      id: body.id,
      name: body.name,
      weight: body.weight,
      sprite: body.sprites?.front_default ?? '',
      types: (body.types ?? []).map((t) => t.type.name),
    };
  }

  private idFromUrl(url: string): number {
    const match = url.match(/\/pokemon\/(\d+)\/?$/);
    if (!match) {
      throw new Error(`Cannot parse pokemon id from URL "${url}"`);
    }
    return Number(match[1]);
  }
}
