import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CommonModule } from '../common/common.module';
import { PokemonModule } from './pokemon.module';
import { PokeApiClient } from './poke-api.client';
import {
  inMemoryMongoModule,
  startInMemoryMongo,
  stopInMemoryMongo,
} from '../test-utils/mongo-test-module';
import { fakePokeApiClient } from '../test-utils/pokeapi-fixtures';

describe('PokemonController (e2e)', () => {
  let app: INestApplication;
  const client = fakePokeApiClient();

  beforeAll(async () => {
    process.env.WARMUP_DISABLED = '1';
    const uri = await startInMemoryMongo();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        inMemoryMongoModule(uri),
        CommonModule,
        PokemonModule,
      ],
    })
      .overrideProvider(PokeApiClient)
      .useValue(client)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await stopInMemoryMongo();
    delete process.env.WARMUP_DISABLED;
  });

  it('returns an empty page when the cache is empty', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/pokemon')
      .expect(200);
    expect(response.body).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it('lists cached entries with pagination metadata', async () => {
    await request(app.getHttpServer())
      .get('/api/pokemon/25')
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/pokemon')
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      id: 25,
      name: 'pikachu',
      weight: 60,
      sprite: 'p.png',
    });
    expect(response.body.total).toBe(1);
  });

  it('filters by case-insensitive search term', async () => {
    await request(app.getHttpServer()).get('/api/pokemon/1').expect(200);
    await request(app.getHttpServer()).get('/api/pokemon/4').expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/pokemon?search=CHAR')
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].name).toBe('charmander');
  });

  it('rejects bogus pagination params with the error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/pokemon?page=0')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      ]),
    });
  });

  it('fetches a single pokemon by id', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/pokemon/7')
      .expect(200);

    expect(response.body).toMatchObject({
      id: 7,
      name: 'squirtle',
      weight: 90,
      sprite: 's.png',
      types: ['water'],
    });
  });
});
