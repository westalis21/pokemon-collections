import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(PokemonCacheService.name);

  constructor(
    @InjectModel(PokemonCache.name)
    private readonly model: Model<PokemonCache>,
    private readonly client: PokeApiClient,
  ) {}

  async search(input: SearchInput): Promise<SearchResult> {
    const filter = input.search
      ? {
          name: {
            $regex: this.escapeRegex(input.search),
            $options: 'i',
          },
        }
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

    const hydrated = await Promise.all(
      (items as PokemonCache[]).map((item) => this.hydrateStub(item)),
    );

    return { items: hydrated, total, page: input.page, limit: input.limit };
  }

  private async hydrateStub(item: PokemonCache): Promise<PokemonCache> {
    if (this.isFullyPopulated(item)) return item;
    try {
      const detail = await this.client.fetchOne(item.id);
      await this.persist(detail);
      return {
        ...item,
        weight: detail.weight,
        sprite: detail.sprite,
        types: detail.types,
      };
    } catch (err) {
      this.logger.warn(
        `Failed to hydrate pokemon ${item.id} (${item.name}): ${(err as Error).message}`,
      );
      return item;
    }
  }

  async getOneByIdOrName(idOrName: number | string): Promise<PokeDetail> {
    const filter =
      typeof idOrName === 'number'
        ? { id: idOrName }
        : /^\d+$/.test(idOrName)
          ? { id: Number(idOrName) }
          : { name: idOrName };

    const cached = (await this.model.findOne(filter).lean()) as
      | (PokemonCache & { weight?: number; sprite?: string })
      | null;

    if (cached && this.isFullyPopulated(cached)) {
      return {
        id: cached.id,
        name: cached.name,
        weight: cached.weight as number,
        sprite: cached.sprite as string,
        types: cached.types ?? [],
      };
    }

    if (cached) {
      // Stub hit: return immediately and fill in the detail in the background.
      const stub: PokeDetail = {
        id: cached.id,
        name: cached.name,
        weight: cached.weight ?? 0,
        sprite: cached.sprite ?? '',
        types: cached.types ?? [],
      };
      void this.client
        .fetchOne(idOrName)
        .then((detail) => this.persist(detail))
        .catch((err) =>
          this.logger.warn(
            `Background detail fill-in failed for ${idOrName}: ${(err as Error).message}`,
          ),
        );
      return stub;
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

    try {
      await this.model.insertMany(missing, { ordered: false });
    } catch (err) {
      if (this.isAllDuplicateKey(err)) {
        this.logger.log(
          `Warmup skipped ${this.duplicateCount(err)} duplicate-key inserts.`,
        );
        return;
      }
      throw err;
    }
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

  private escapeRegex(term: string): string {
    return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private isAllDuplicateKey(err: unknown): boolean {
    const writeErrors = this.extractWriteErrors(err);
    return writeErrors.length > 0 && writeErrors.every((e) => e.code === 11000);
  }

  private duplicateCount(err: unknown): number {
    return this.extractWriteErrors(err).length;
  }

  private extractWriteErrors(err: unknown): { code: number }[] {
    if (typeof err !== 'object' || err === null) return [];
    const candidate = err as {
      writeErrors?: { code: number }[];
      code?: number;
    };
    if (Array.isArray(candidate.writeErrors)) return candidate.writeErrors;
    if (candidate.code === 11000) return [{ code: 11000 }];
    return [];
  }
}
