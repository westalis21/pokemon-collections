import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ListsService } from './lists.service';
import { List } from './schemas/list.schema';
import { PokemonCacheService } from '../pokemon/pokemon-cache.service';
import { ValidationException } from '../common/exceptions/validation.exception';

describe('ListsService', () => {
  let service: ListsService;
  let model: jest.Mock & {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };
  let cache: { getOneByIdOrName: jest.Mock };

  beforeEach(async () => {
    model = Object.assign(jest.fn(), {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    });

    cache = {
      getOneByIdOrName: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ListsService,
        { provide: getModelToken(List.name), useValue: model },
        { provide: PokemonCacheService, useValue: cache },
      ],
    }).compile();

    service = moduleRef.get(ListsService);
  });

  describe('create', () => {
    it('snapshots ids via the cache, validates, and persists', async () => {
      cache.getOneByIdOrName
        .mockResolvedValueOnce({ id: 1, name: 'bulbasaur', weight: 100, sprite: 'b.png', types: ['grass'] })
        .mockResolvedValueOnce({ id: 4, name: 'charmander', weight: 100, sprite: 'c.png', types: ['fire'] })
        .mockResolvedValueOnce({ id: 7, name: 'squirtle', weight: 100, sprite: 's.png', types: ['water'] });

      const created = {
        _id: 'abc',
        name: 'My team',
        items: [
          { pokemonId: 1, name: 'bulbasaur', weight: 100, sprite: 'b.png' },
          { pokemonId: 4, name: 'charmander', weight: 100, sprite: 'c.png' },
          { pokemonId: 7, name: 'squirtle', weight: 100, sprite: 's.png' },
        ],
        createdAt: new Date('2026-05-08T12:00:00Z'),
      };
      model.create.mockResolvedValueOnce(created);

      const result = await service.create({
        name: 'My team',
        pokemonIds: [1, 4, 7],
      });

      expect(model.create).toHaveBeenCalledWith({
        name: 'My team',
        items: created.items,
      });
      expect(result).toEqual(created);
    });

    it('throws ValidationException listing every failing rule', async () => {
      const pikachuSnapshot = {
        id: 25,
        name: 'pikachu',
        weight: 2000,
        sprite: 'p.png',
        types: [],
      };
      cache.getOneByIdOrName
        .mockResolvedValueOnce(pikachuSnapshot)
        .mockResolvedValueOnce(pikachuSnapshot);

      await expect(
        service.create({ name: 'X', pokemonIds: [25] }),
      ).rejects.toBeInstanceOf(ValidationException);
      try {
        await service.create({ name: 'X', pokemonIds: [25] });
      } catch (err) {
        const validation = err as ValidationException;
        const codes = validation.errors.map((e) => e.code).sort();
        expect(codes).toEqual(['MIN_SPECIES', 'WEIGHT_EXCEEDED']);
      }
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('createFromFile', () => {
    it('enriches sprite from cache and persists when validation passes', async () => {
      cache.getOneByIdOrName
        .mockResolvedValueOnce({ id: 1, name: 'bulbasaur', weight: 0, sprite: 'b.png', types: [] })
        .mockResolvedValueOnce({ id: 4, name: 'charmander', weight: 0, sprite: 'c.png', types: [] })
        .mockResolvedValueOnce({ id: 7, name: 'squirtle', weight: 0, sprite: 's.png', types: [] });
      model.create.mockResolvedValueOnce({ _id: 'id', name: 'Imported', items: [] });

      const file = {
        schemaVersion: 1 as const,
        name: 'Imported',
        items: [
          { pokemonId: 1, name: 'bulbasaur', weight: 100 },
          { pokemonId: 4, name: 'charmander', weight: 100 },
          { pokemonId: 7, name: 'squirtle', weight: 100 },
        ],
      };

      await service.createFromFile(file);

      expect(model.create).toHaveBeenCalledWith({
        name: 'Imported',
        items: [
          { pokemonId: 1, name: 'bulbasaur', weight: 100, sprite: 'b.png' },
          { pokemonId: 4, name: 'charmander', weight: 100, sprite: 'c.png' },
          { pokemonId: 7, name: 'squirtle', weight: 100, sprite: 's.png' },
        ],
      });
    });

    it('falls back to empty sprite when the cache lookup fails', async () => {
      cache.getOneByIdOrName
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ id: 4, name: 'charmander', weight: 0, sprite: 'c.png', types: [] })
        .mockResolvedValueOnce({ id: 7, name: 'squirtle', weight: 0, sprite: 's.png', types: [] });
      model.create.mockResolvedValueOnce({ _id: 'id', name: 'Imported', items: [] });

      const file = {
        schemaVersion: 1 as const,
        name: 'Imported',
        items: [
          { pokemonId: 1, name: 'bulbasaur', weight: 100 },
          { pokemonId: 4, name: 'charmander', weight: 100 },
          { pokemonId: 7, name: 'squirtle', weight: 100 },
        ],
      };

      await service.createFromFile(file);

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            { pokemonId: 1, name: 'bulbasaur', weight: 100, sprite: '' },
          ]),
        }),
      );
    });
  });

  describe('summaries', () => {
    it('lists summaries sorted by createdAt desc', async () => {
      const docs = [
        {
          _id: 'a',
          name: 'A',
          items: [{ weight: 10 }, { weight: 20 }],
          createdAt: new Date(),
        },
      ];
      model.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(docs),
      });

      const result = await service.findAllSummaries();

      expect(result).toEqual([
        {
          id: 'a',
          name: 'A',
          itemCount: 2,
          totalWeight: 30,
          createdAt: docs[0].createdAt,
        },
      ]);
    });
  });
});
