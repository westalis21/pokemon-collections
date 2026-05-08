import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ListFileCodec, ListValidator, type ListFileV1 } from '@pokemon/shared';
import { List, ListDocument } from './schemas/list.schema';
import { CreateListDto } from './dto/create-list.dto';
import { PokemonCacheService } from '../pokemon/pokemon-cache.service';
import { ValidationException } from '../common/exceptions/validation.exception';

export interface ListSummary {
  id: string;
  name: string;
  itemCount: number;
  totalWeight: number;
  createdAt: Date;
}

@Injectable()
export class ListsService {
  private readonly logger = new Logger(ListsService.name);

  constructor(
    @InjectModel(List.name) private readonly model: Model<List>,
    private readonly cache: PokemonCacheService,
  ) {}

  async create(input: CreateListDto): Promise<ListDocument> {
    const items = await Promise.all(
      input.pokemonIds.map(async (id) => {
        const detail = await this.cache.getOneByIdOrName(id);
        return {
          pokemonId: detail.id,
          name: detail.name,
          weight: detail.weight,
          sprite: detail.sprite,
        };
      }),
    );

    this.assertValid(items);
    return this.model.create({ name: input.name, items });
  }

  async createFromFile(file: ListFileV1): Promise<ListDocument> {
    const items = await Promise.all(
      file.items.map(async (item) => {
        let sprite = '';
        try {
          const detail = await this.cache.getOneByIdOrName(item.pokemonId);
          sprite = detail.sprite ?? '';
        } catch (err) {
          this.logger.warn(
            `Sprite lookup failed for pokemonId=${item.pokemonId}: ${(err as Error).message}`,
          );
        }
        return {
          pokemonId: item.pokemonId,
          name: item.name,
          weight: item.weight,
          sprite,
        };
      }),
    );

    this.assertValid(items);
    return this.model.create({ name: file.name, items });
  }

  async findAllSummaries(): Promise<ListSummary[]> {
    const docs = (await this.model.find().sort({ createdAt: -1 }).lean()) as Array<
      ListDocument & { _id: { toString(): string } }
    >;
    return docs.map((doc) => ({
      id: String(doc._id),
      name: doc.name,
      itemCount: doc.items.length,
      totalWeight: doc.items.reduce((sum, item) => sum + item.weight, 0),
      createdAt: doc.createdAt,
    }));
  }

  async findOne(id: string): Promise<ListDocument> {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException(`List ${id} not found.`);
    return doc as ListDocument;
  }

  async toFile(id: string): Promise<{ filename: string; payload: string }> {
    const doc = await this.findOne(id);
    const payload = ListFileCodec.encode({
      name: doc.name,
      items: doc.items.map((item) => ({
        pokemonId: item.pokemonId,
        name: item.name,
        weight: item.weight,
      })),
    });
    const safe = this.sanitizeFilename(doc.name);
    return { filename: `${safe}.json`, payload };
  }

  async remove(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).lean();
    if (!result) throw new NotFoundException(`List ${id} not found.`);
  }

  private sanitizeFilename(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return slug || 'list';
  }

  private assertValid(
    items: { pokemonId: number; name: string; weight: number; sprite: string }[],
  ): void {
    const result = ListValidator.validate(items);
    if (!result.ok) {
      throw new ValidationException(
        result.errors.map((e) => ({ code: e.code, message: e.message })),
      );
    }
  }
}
