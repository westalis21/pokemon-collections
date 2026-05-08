import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PokemonCache } from './schemas/pokemon-cache.schema';
import { PokeApiClient, PokeDetail } from './poke-api.client';

export interface SearchInput {
  page: number;
  limit: number;
  search?: string;
}

export interface SearchResult {
  items: PokemonCache[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class PokemonCacheService {
  constructor(
    @InjectModel(PokemonCache.name)
    private readonly model: Model<PokemonCache>,
    private readonly client: PokeApiClient,
  ) {}

  async search(input: SearchInput): Promise<SearchResult> {
    const filter = input.search
      ? { name: { $regex: input.search, $options: 'i' } }
      : {};
    const skip = (input.page - 1) * input.limit;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ id: 1 })
        .skip(skip)
        .limit(input.limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return { items: items as PokemonCache[], total, page: input.page, limit: input.limit };
  }

  async getOneByIdOrName(
    idOrName: number | string,
  ): Promise<PokemonCache & { weight: number; sprite: string; types: string[] }> {
    const filter =
      typeof idOrName === 'number'
        ? { id: idOrName }
        : isFinite(Number(idOrName))
          ? { id: Number(idOrName) }
          : { name: idOrName };

    const cached = (await this.model.findOne(filter).lean()) as
      | (PokemonCache & { weight?: number; sprite?: string })
      | null;

    if (cached && this.isFullyPopulated(cached)) {
      return cached as PokemonCache & {
        weight: number;
        sprite: string;
        types: string[];
      };
    }

    const detail = await this.client.fetchOne(idOrName);
    await this.persist(detail);
    return detail;
  }

  async warmup(limit: number): Promise<void> {
    const index = await this.client.fetchIndex(limit);
    if (index.length === 0) return;

    const existing = (await this.model
      .find({ id: { $in: index.map((e) => e.id) } })
      .lean()) as { id: number }[];
    const known = new Set(existing.map((d) => d.id));
    const missing = index.filter((entry) => !known.has(entry.id));
    if (missing.length === 0) return;

    await this.model.insertMany(missing, { ordered: false });
  }

  private isFullyPopulated(
    doc: PokemonCache & { weight?: number; sprite?: string },
  ): boolean {
    return typeof doc.weight === 'number' && typeof doc.sprite === 'string';
  }

  private async persist(detail: PokeDetail): Promise<void> {
    await this.model.updateOne(
      { id: detail.id },
      {
        $set: {
          id: detail.id,
          name: detail.name,
          weight: detail.weight,
          sprite: detail.sprite,
          types: detail.types,
          fetchedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}
