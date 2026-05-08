import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PokemonCache } from './schemas/pokemon-cache.schema';
import { PokemonCacheService } from './pokemon-cache.service';
import { PokeApiClient } from './poke-api.client';

describe('PokemonCacheService', () => {
  let service: PokemonCacheService;
  let model: {
    find: jest.Mock;
    findOne: jest.Mock;
    countDocuments: jest.Mock;
    insertMany: jest.Mock;
    updateOne: jest.Mock;
  };
  let client: { fetchOne: jest.Mock; fetchIndex: jest.Mock };

  beforeEach(async () => {
    const chainable = (result: unknown) => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(result),
    });

    model = {
      find: jest.fn().mockImplementation(() => chainable([])),
      findOne: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      insertMany: jest.fn().mockResolvedValue([]),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };

    client = {
      fetchOne: jest.fn(),
      fetchIndex: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PokemonCacheService,
        { provide: getModelToken(PokemonCache.name), useValue: model },
        { provide: PokeApiClient, useValue: client },
      ],
    }).compile();

    service = moduleRef.get(PokemonCacheService);
  });

  describe('search', () => {
    it('paginates against the cache without a search term', async () => {
      const docs = [{ id: 1, name: 'bulbasaur' }];
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(docs),
      });
      model.countDocuments.mockResolvedValue(1);

      const result = await service.search({ page: 1, limit: 20 });

      expect(model.find).toHaveBeenCalledWith({});
      expect(result).toEqual({
        items: docs,
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('filters by name substring when search is provided', async () => {
      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      model.countDocuments.mockResolvedValue(0);

      await service.search({ page: 2, limit: 10, search: 'pika' });

      expect(model.find).toHaveBeenCalledWith({
        name: { $regex: 'pika', $options: 'i' },
      });
      expect(model.countDocuments).toHaveBeenCalledWith({
        name: { $regex: 'pika', $options: 'i' },
      });
    });
  });

  describe('getOneByIdOrName', () => {
    it('returns the cached document when fully populated', async () => {
      const fullDoc = {
        id: 25,
        name: 'pikachu',
        weight: 60,
        sprite: 'pika.png',
        types: ['electric'],
      };
      model.findOne.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(fullDoc),
      });

      const result = await service.getOneByIdOrName(25);

      expect(result).toEqual(fullDoc);
      expect(client.fetchOne).not.toHaveBeenCalled();
    });

    it('fills in via the client when the cache has only a stub', async () => {
      const stub = { id: 25, name: 'pikachu' };
      const enriched = {
        id: 25,
        name: 'pikachu',
        weight: 60,
        sprite: 'pika.png',
        types: ['electric'],
      };
      model.findOne.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(stub),
      });
      client.fetchOne.mockResolvedValueOnce(enriched);

      const result = await service.getOneByIdOrName('pikachu');

      expect(client.fetchOne).toHaveBeenCalledWith('pikachu');
      expect(model.updateOne).toHaveBeenCalledWith(
        { id: 25 },
        expect.objectContaining({
          $set: expect.objectContaining({
            weight: 60,
            sprite: 'pika.png',
            types: ['electric'],
          }),
        }),
        { upsert: true },
      );
      expect(result).toEqual(enriched);
    });

    it('fetches and persists on a complete cache miss', async () => {
      const enriched = {
        id: 1,
        name: 'bulbasaur',
        weight: 69,
        sprite: 'bulba.png',
        types: ['grass'],
      };
      model.findOne.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(null),
      });
      client.fetchOne.mockResolvedValueOnce(enriched);

      const result = await service.getOneByIdOrName(1);

      expect(client.fetchOne).toHaveBeenCalledWith(1);
      expect(model.updateOne).toHaveBeenCalled();
      expect(result).toEqual(enriched);
    });
  });

  describe('warmup', () => {
    it('inserts only ids that are missing from the cache', async () => {
      client.fetchIndex.mockResolvedValueOnce([
        { id: 1, name: 'bulbasaur' },
        { id: 25, name: 'pikachu' },
      ]);
      model.find.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue([{ id: 1 }]),
      });

      await service.warmup(2);

      expect(client.fetchIndex).toHaveBeenCalledWith(2);
      expect(model.insertMany).toHaveBeenCalledWith(
        [{ id: 25, name: 'pikachu' }],
        { ordered: false },
      );
    });

    it('skips insertMany when nothing is missing', async () => {
      client.fetchIndex.mockResolvedValueOnce([
        { id: 1, name: 'bulbasaur' },
      ]);
      model.find.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue([{ id: 1 }]),
      });

      await service.warmup(1);

      expect(model.insertMany).not.toHaveBeenCalled();
    });
  });
});
