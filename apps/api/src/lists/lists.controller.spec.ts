import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CommonModule } from '../common/common.module';
import { ListsModule } from './lists.module';
import { PokeApiClient } from '../pokemon/poke-api.client';
import {
  inMemoryMongoModule,
  startInMemoryMongo,
  stopInMemoryMongo,
} from '../test-utils/mongo-test-module';
import { fakePokeApiClient } from '../test-utils/pokeapi-fixtures';

describe('ListsController (e2e)', () => {
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
        ListsModule,
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

  it('rejects invalid DTO with VALIDATION_ERROR envelope', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/lists')
      .send({ name: '', pokemonIds: [] })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.errors[0].code).toBe('VALIDATION_ERROR');
  });

  it('creates a list when validation passes', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/lists')
      .send({ name: 'Starters', pokemonIds: [1, 4, 7] })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Starters',
      items: expect.arrayContaining([
        expect.objectContaining({ pokemonId: 1, name: 'bulbasaur', sprite: 'b.png' }),
      ]),
    });
    expect(response.body._id).toBeDefined();
  });

  it('rejects domain rule failures with both codes when both fail', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/lists')
      .send({ name: 'Heavy', pokemonIds: [25, 25] })
      .expect(400);

    const codes = response.body.errors.map((e: { code: string }) => e.code).sort();
    expect(codes).toEqual(['MIN_SPECIES']);
  });

  it('lists summaries with itemCount and totalWeight', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/lists')
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Starters',
          itemCount: 3,
          totalWeight: 244,
        }),
      ]),
    );
  });

  it('returns full list detail by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/lists')
      .send({ name: 'Detail', pokemonIds: [1, 4, 7] })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/lists/${created.body._id}`)
      .expect(200);

    expect(response.body.name).toBe('Detail');
    expect(response.body.items).toHaveLength(3);
  });

  it('404s a missing list', async () => {
    await request(app.getHttpServer())
      .get('/api/lists/64a000000000000000000000')
      .expect(404);
  });

  it('deletes a list', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/lists')
      .send({ name: 'Delete me', pokemonIds: [1, 4, 7] })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/lists/${created.body._id}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/lists/${created.body._id}`)
      .expect(404);
  });

  it('streams a v1 file for download with the correct headers', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/lists')
      .send({ name: 'Downloadable', pokemonIds: [1, 4, 7] })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/lists/${created.body._id}/download`)
      .expect(200);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="downloadable\.json"/,
    );

    const body = JSON.parse(response.text);
    expect(body.schemaVersion).toBe(1);
    expect(body.name).toBe('Downloadable');
    expect(body.items).toHaveLength(3);
    expect(body.items[0]).toEqual({
      pokemonId: 1,
      name: 'bulbasaur',
      weight: 69,
    });
  });

  it('imports a v1 file', async () => {
    const file = JSON.stringify({
      schemaVersion: 1,
      name: 'Imported',
      items: [
        { pokemonId: 1, name: 'bulbasaur', weight: 100 },
        { pokemonId: 4, name: 'charmander', weight: 100 },
        { pokemonId: 7, name: 'squirtle', weight: 100 },
      ],
    });

    const response = await request(app.getHttpServer())
      .post('/api/lists/upload')
      .attach('file', Buffer.from(file), 'team.json')
      .expect(201);

    expect(response.body.name).toBe('Imported');
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0].sprite).toBe('b.png');
  });

  it('rejects a malformed JSON upload with INVALID_FILE_FORMAT', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/lists/upload')
      .attach('file', Buffer.from('this is not json'), 'team.json')
      .expect(400);

    expect(response.body.errors[0].code).toBe('INVALID_FILE_FORMAT');
  });

  it('rejects an unknown schemaVersion with UNSUPPORTED_FILE_VERSION', async () => {
    const file = JSON.stringify({
      schemaVersion: 99,
      name: 'Future',
      items: [],
    });

    const response = await request(app.getHttpServer())
      .post('/api/lists/upload')
      .attach('file', Buffer.from(file), 'future.json')
      .expect(400);

    expect(response.body.errors[0].code).toBe('UNSUPPORTED_FILE_VERSION');
  });

  it('rejects a file that fails domain validation', async () => {
    const file = JSON.stringify({
      schemaVersion: 1,
      name: 'Two',
      items: [
        { pokemonId: 1, name: 'bulbasaur', weight: 100 },
        { pokemonId: 4, name: 'charmander', weight: 100 },
      ],
    });

    const response = await request(app.getHttpServer())
      .post('/api/lists/upload')
      .attach('file', Buffer.from(file), 'two.json')
      .expect(400);

    expect(response.body.errors[0].code).toBe('MIN_SPECIES');
  });
});
