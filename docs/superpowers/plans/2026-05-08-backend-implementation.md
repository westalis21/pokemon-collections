# Backend Implementation Plan (Pokemon Collections — Plan 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full `apps/api` backend on top of the foundation from Plan 1 — Mongoose schemas, PokéAPI cache + client, REST endpoints (`/api/pokemon`, `/api/lists`, list download/upload), error envelope, and integration tests using `mongodb-memory-server`. The API consumes `@pokemon/shared` (`ListValidator`, `ListFileCodec`, types) so validation logic and the file format stay byte-identical with the future web client.

**Architecture:**
- Two domain modules — `PokemonModule` (catalog + cache + PokéAPI proxy) and `ListsModule` (list CRUD + import/export) — plus a thin `CommonModule` for the global exception filter and validation pipe.
- Mongoose drives persistence: `PokemonCache` (one doc per Pokémon, cold-warmed on boot, lazily filled on detail) and `List` (embedded `PokemonSnapshot[]`, sorted by `createdAt` desc).
- Validation is layered: `class-validator` on DTOs at the HTTP edge, then `ListValidator.validate(...)` from `@pokemon/shared` for the domain rules — both surface through the same error envelope `{ statusCode, errors: [{ code, message }] }`.
- All routes live under the `/api` global prefix (`/api/health`, `/api/pokemon`, `/api/lists`).

**Tech Stack:** NestJS 11, Mongoose 8, `@nestjs/mongoose` 11, `@nestjs/config` 4, `class-validator` 0.14, `class-transformer` 0.5, `multer` 1.x, `mongodb-memory-server` 10, Supertest 7, Zod 3 (already pulled in via `@pokemon/shared`), Node 22 (built-in `fetch`).

**Spec:** `docs/superpowers/specs/2026-05-08-pokemon-collections-design.md`
**Plan 1 (foundation):** `docs/superpowers/plans/2026-05-08-foundation-and-scaffolding.md`

**Constraints (from project memory):**
- All in-code text, identifiers, commit messages, and README updates in **English**.
- **Never** add `Co-Authored-By: Claude` or any reference to Claude in commits, PRs, or docs.
- Prefer red→green commits where the code is genuinely test-driven (services, validators, request handlers).

---

## File Structure

```
apps/api/
├── package.json                                        new deps + pretest builds shared
├── nest-cli.json                                       (unchanged from Plan 1)
├── src/
│   ├── main.ts                                         + setGlobalPrefix('api'), ValidationPipe
│   ├── app.module.ts                                   + ConfigModule, MongooseModule, modules
│   │
│   ├── common/
│   │   ├── common.module.ts                            APP_FILTER + APP_PIPE bindings
│   │   ├── filters/http-exception.filter.ts            envelope every error
│   │   ├── filters/http-exception.filter.spec.ts
│   │   ├── exceptions/validation.exception.ts          400 with { code, message }[]
│   │   └── exceptions/format.exception.ts              400 for codec failures
│   │
│   ├── pokemon/
│   │   ├── pokemon.module.ts
│   │   ├── pokemon.controller.ts                       GET /pokemon, GET /pokemon/:idOrName
│   │   ├── pokemon.controller.spec.ts                  e2e (memory mongo + mocked client)
│   │   ├── pokemon-cache.service.ts                    search/paginate, getOne, fillIn, warmup
│   │   ├── pokemon-cache.service.spec.ts               unit (mocked model + mocked client)
│   │   ├── poke-api.client.ts                          fetchIndex, fetchOne (Node fetch)
│   │   ├── poke-api.client.spec.ts                     unit (mocked global fetch)
│   │   ├── dto/list-pokemon.query.dto.ts               page, limit, search
│   │   └── schemas/pokemon-cache.schema.ts             Mongoose schema
│   │
│   ├── lists/
│   │   ├── lists.module.ts
│   │   ├── lists.controller.ts                         CRUD + download + upload
│   │   ├── lists.controller.spec.ts                    e2e covering all routes
│   │   ├── lists.service.ts                            create, findAll, findOne, remove, fromFile
│   │   ├── lists.service.spec.ts                      unit (mocked model + mocked cache service)
│   │   ├── dto/create-list.dto.ts                      { name, pokemonIds[] }
│   │   └── schemas/list.schema.ts                      List + embedded PokemonSnapshot
│   │
│   └── test-utils/
│       ├── mongo-test-module.ts                        forRootAsync factory wired to mongo-memory
│       └── pokeapi-fixtures.ts                         deterministic PokéAPI sample payloads
└── test/
    └── (kept empty in this plan — e2e specs co-locate alongside controllers)
```

**Decomposition rationale:**
- One service per concern. `PokemonCacheService` owns Mongo + fill-in; `PokeApiClient` owns HTTP. The boundary lets us mock either side independently in tests.
- DTOs and schemas live in their own folders so future plans (e.g. adding Pokémon types) extend an isolated file.
- The exception filter lives in `common/` because both modules emit the same envelope; keeping it shared prevents per-module drift.
- `test-utils/` houses shared in-memory Mongo wiring — every controller spec imports the same factory, no copy-paste.

---

## Pre-flight

- Plan 1 must be merged or already on `main`: `apps/api` skeleton with `/health`, `apps/web`, `packages/shared` (codec + validator + dist build), `docker-compose.yml` (mongo + dev api + dev web), root tooling.
- From the repo root: `git status` should be clean and the current branch should be where you want these commits to land. If pushing to `main` is forbidden by branch protection, create a feature branch first: `git checkout -b plan2/backend`.
- `packages/shared/dist/` must be built at least once: `npm run build -w @pokemon/shared` (Task 1 also wires this into `pretest`).

---

## Task 1: Wire backend dependencies, global prefix, and config

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/health/health.controller.spec.ts`
- Modify: `package.json` (root, optional `pretest` for the shared build)

- [ ] **Step 1: Add API runtime + dev dependencies**

Edit `apps/api/package.json` so the `dependencies` and `devDependencies` blocks read:

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/mongoose": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@pokemon/shared": "*",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "mongoose": "^8.7.0",
    "multer": "^1.4.5-lts.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.13",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.7.5",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "mongodb-memory-server": "^10.1.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.6.3"
  }
}
```

Also extend the existing `scripts` block:

```json
"scripts": {
  "build": "nest build",
  "start": "node dist/main.js",
  "start:dev": "nest start --watch",
  "pretest": "npm run build --workspace=@pokemon/shared --if-present",
  "test": "jest"
}
```

- [ ] **Step 2: Install + verify**

Run from the repo root:

```bash
npm install
```

Expected: shared package symlinks into `node_modules/@pokemon/shared`, no peer-dep errors.

Sanity-check the symlink resolves to `dist/index.js`:

```bash
node -e "console.log(require.resolve('@pokemon/shared'))"
```

Expected: a path under `node_modules/@pokemon/shared/dist/index.js`. (If it errors, run `npm run build -w @pokemon/shared` first.)

- [ ] **Step 3: Bootstrap with global prefix and validation pipe**

Replace `apps/api/src/main.ts` with:

```ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
```

- [ ] **Step 4: Wire ConfigModule + MongooseModule into the root module**

Replace `apps/api/src/app.module.ts` with:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGO_URI') ??
          'mongodb://localhost:27017/pokemon',
      }),
    }),
    CommonModule,
    HealthModule,
    // PokemonModule and ListsModule are wired in their own tasks below.
  ],
})
export class AppModule {}
```

(`CommonModule` is added in Task 2; `PokemonModule` in Task 6; `ListsModule` in Task 9. Forward-importing them here is fine because each task that introduces them flips a real export.)

- [ ] **Step 5: Update the health controller test for the new global prefix**

The `HealthController` itself does not change, but the unit spec previously called `controller.check()` directly — that still works. We add a quick smoke that the path resolves under `/api/health` once the prefix is on. Replace `apps/api/src/health/health.controller.spec.ts` with:

```ts
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok status', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    const controller = moduleRef.get(HealthController);
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
```

(Same body — the e2e check that `/api/health` responds runs in Task 2 against the full bootstrapped app.)

- [ ] **Step 6: Run the existing api tests + build**

```bash
npm run build -w @pokemon/shared
npm test -w @pokemon/api
npm run build -w @pokemon/api
```

Expected: existing health spec still passes, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/src/main.ts apps/api/src/app.module.ts \
        apps/api/src/health/health.controller.spec.ts package.json package-lock.json
git commit -m "chore(api): wire mongoose, config, validation pipe, and /api prefix"
```

---

## Task 2: Common module — error envelope filter + custom exceptions

**Files:**
- Create: `apps/api/src/common/common.module.ts`
- Create: `apps/api/src/common/exceptions/validation.exception.ts`
- Create: `apps/api/src/common/exceptions/format.exception.ts`
- Create: `apps/api/src/common/filters/http-exception.filter.ts`
- Test: `apps/api/src/common/filters/http-exception.filter.spec.ts`

The envelope (locked in by the spec, §4.2):
```json
{ "statusCode": 400, "errors": [ { "code": "MIN_SPECIES", "message": "..." } ] }
```

- [ ] **Step 1: Define the custom exceptions**

Create `apps/api/src/common/exceptions/validation.exception.ts`:

```ts
import { BadRequestException } from '@nestjs/common';

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export class ValidationException extends BadRequestException {
  constructor(public readonly errors: ApiErrorPayload[]) {
    super({ errors });
  }
}
```

Create `apps/api/src/common/exceptions/format.exception.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import type { ApiErrorPayload } from './validation.exception';

export class FormatException extends BadRequestException {
  constructor(public readonly error: ApiErrorPayload) {
    super({ errors: [error] });
  }
}
```

- [ ] **Step 2: Write the failing filter spec**

Create `apps/api/src/common/filters/http-exception.filter.spec.ts`:

```ts
import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ValidationException } from '../exceptions/validation.exception';

const buildHost = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('preserves a ValidationException error array verbatim', () => {
    const { host, status, json } = buildHost();
    const exception = new ValidationException([
      { code: 'MIN_SPECIES', message: 'Need three species.' },
      { code: 'WEIGHT_EXCEEDED', message: 'Too heavy.' },
    ]);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      errors: [
        { code: 'MIN_SPECIES', message: 'Need three species.' },
        { code: 'WEIGHT_EXCEEDED', message: 'Too heavy.' },
      ],
    });
  });

  it('wraps a class-validator BadRequestException into the envelope', () => {
    const { host, status, json } = buildHost();
    const exception = new BadRequestException({
      message: ['name should not be empty', 'pokemonIds must be an array'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      errors: [
        { code: 'VALIDATION_ERROR', message: 'name should not be empty' },
        { code: 'VALIDATION_ERROR', message: 'pokemonIds must be an array' },
      ],
    });
  });

  it('falls back to a single VALIDATION_ERROR for a plain string message', () => {
    const { host, status, json } = buildHost();

    filter.catch(new BadRequestException('id must be a number'), host);

    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      errors: [{ code: 'VALIDATION_ERROR', message: 'id must be a number' }],
    });
  });

  it('returns INTERNAL_SERVER_ERROR for unknown HttpException codes', () => {
    const { host, status, json } = buildHost();

    filter.catch(
      new HttpException('boom', HttpStatus.INTERNAL_SERVER_ERROR),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errors: [{ code: 'INTERNAL_ERROR', message: 'boom' }],
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm test -w @pokemon/api -- --testPathPattern=http-exception.filter
```

Expected: FAIL — `Cannot find module './http-exception.filter'`.

- [ ] **Step 4: Implement the filter**

Create `apps/api/src/common/filters/http-exception.filter.ts`:

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorPayload } from '../exceptions/validation.exception';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const payload = exception.getResponse();

    response
      .status(status)
      .json({ statusCode: status, errors: this.toErrors(status, payload) });
  }

  private toErrors(status: number, payload: unknown): ApiErrorPayload[] {
    if (this.isErrorsEnvelope(payload)) {
      return payload.errors;
    }

    if (this.isClassValidatorEnvelope(payload)) {
      return payload.message.map((message) => ({
        code: 'VALIDATION_ERROR',
        message,
      }));
    }

    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const message = (payload as { message: unknown }).message;
      if (typeof message === 'string') {
        return [{ code: this.fallbackCode(status), message }];
      }
    }

    if (typeof payload === 'string') {
      return [{ code: this.fallbackCode(status), message: payload }];
    }

    return [{ code: this.fallbackCode(status), message: 'Unexpected error.' }];
  }

  private fallbackCode(status: number): string {
    return status >= HttpStatus.INTERNAL_SERVER_ERROR
      ? 'INTERNAL_ERROR'
      : 'VALIDATION_ERROR';
  }

  private isErrorsEnvelope(
    value: unknown,
  ): value is { errors: ApiErrorPayload[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      Array.isArray((value as { errors?: unknown }).errors)
    );
  }

  private isClassValidatorEnvelope(
    value: unknown,
  ): value is { message: string[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      Array.isArray((value as { message?: unknown }).message)
    );
  }
}
```

- [ ] **Step 5: Wire the filter in CommonModule**

Create `apps/api/src/common/common.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Module({
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class CommonModule {}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
npm test -w @pokemon/api
```

Expected: 5 tests pass (1 health + 4 filter).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/common
git commit -m "feat(api): add http exception filter with error envelope"
```

---

## Task 3: PokemonCache schema

**Files:**
- Create: `apps/api/src/pokemon/schemas/pokemon-cache.schema.ts`

The cache document (spec §4.3): `{ id (unique), name (indexed), weight, sprite, types: string[], fetchedAt }`. Stub documents allowed (only `id` + `name` populated until detail fill-in).

- [ ] **Step 1: Define the schema**

Create `apps/api/src/pokemon/schemas/pokemon-cache.schema.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'pokemon_cache' })
export class PokemonCache {
  @Prop({ required: true, unique: true, index: true })
  id!: number;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop()
  weight?: number;

  @Prop()
  sprite?: string;

  @Prop({ type: [String], default: [] })
  types!: string[];

  @Prop()
  fetchedAt?: Date;
}

export type PokemonCacheDocument = HydratedDocument<PokemonCache>;
export const PokemonCacheSchema = SchemaFactory.createForClass(PokemonCache);
PokemonCacheSchema.index({ name: 'text' });
```

- [ ] **Step 2: Smoke-compile**

```bash
npm run build -w @pokemon/api
```

Expected: success.

(No unit test — Mongoose schemas are exercised by the service spec in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/pokemon/schemas
git commit -m "feat(api): add pokemon cache mongoose schema"
```

---

## Task 4: PokeApiClient (TDD)

**Files:**
- Test: `apps/api/src/pokemon/poke-api.client.spec.ts`
- Create: `apps/api/src/pokemon/poke-api.client.ts`

Two methods needed by the cache strategy in spec §4.4:
- `fetchIndex(limit)` — returns `[{ id, name }]` from `/api/v2/pokemon?limit=N`.
- `fetchOne(idOrName)` — returns `{ id, name, weight, sprite, types: string[] }`.

We mock the global `fetch` so unit tests stay hermetic.

- [ ] **Step 1: Write the failing client spec (red)**

Create `apps/api/src/pokemon/poke-api.client.spec.ts`:

```ts
import { PokeApiClient } from './poke-api.client';

const ok = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: async () => body } as Response);
const fail = (status: number) =>
  Promise.resolve({
    ok: false,
    status,
    json: async () => ({}),
    statusText: 'err',
  } as Response);

describe('PokeApiClient', () => {
  let fetchMock: jest.SpyInstance;
  let client: PokeApiClient;

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    client = new PokeApiClient();
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('fetchIndex', () => {
    it('maps /pokemon list responses to { id, name } pairs', async () => {
      fetchMock.mockReturnValueOnce(
        ok({
          results: [
            { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
            { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
          ],
        }),
      );

      const result = await client.fetchIndex(2);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://pokeapi.co/api/v2/pokemon?limit=2',
      );
      expect(result).toEqual([
        { id: 1, name: 'bulbasaur' },
        { id: 25, name: 'pikachu' },
      ]);
    });

    it('throws when the index response is not ok', async () => {
      fetchMock.mockReturnValueOnce(fail(500));
      await expect(client.fetchIndex(10)).rejects.toThrow(
        /PokeAPI index failed/i,
      );
    });
  });

  describe('fetchOne', () => {
    it('maps detail payloads to the snapshot shape', async () => {
      fetchMock.mockReturnValueOnce(
        ok({
          id: 25,
          name: 'pikachu',
          weight: 60,
          sprites: { front_default: 'https://img/25.png' },
          types: [
            { slot: 1, type: { name: 'electric' } },
          ],
        }),
      );

      const result = await client.fetchOne('25');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://pokeapi.co/api/v2/pokemon/25',
      );
      expect(result).toEqual({
        id: 25,
        name: 'pikachu',
        weight: 60,
        sprite: 'https://img/25.png',
        types: ['electric'],
      });
    });

    it('falls back to empty sprite if missing', async () => {
      fetchMock.mockReturnValueOnce(
        ok({
          id: 1,
          name: 'bulbasaur',
          weight: 69,
          sprites: { front_default: null },
          types: [],
        }),
      );

      const result = await client.fetchOne(1);
      expect(result.sprite).toBe('');
    });

    it('throws on a 404 with the requested key in the message', async () => {
      fetchMock.mockReturnValueOnce(fail(404));
      await expect(client.fetchOne('missingno')).rejects.toThrow(
        /missingno/,
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails (red)**

```bash
npm test -w @pokemon/api -- --testPathPattern=poke-api.client
```

Expected: FAIL — module not found.

- [ ] **Step 3: Commit the red state**

```bash
git add apps/api/src/pokemon/poke-api.client.spec.ts
git commit -m "test(api): add failing pokeapi client spec (red)"
```

- [ ] **Step 4: Implement the client (green)**

Create `apps/api/src/pokemon/poke-api.client.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests to verify they pass (green)**

```bash
npm test -w @pokemon/api -- --testPathPattern=poke-api.client
```

Expected: 5 client tests pass.

- [ ] **Step 6: Commit the green state**

```bash
git add apps/api/src/pokemon/poke-api.client.ts
git commit -m "feat(api): implement pokeapi client (green)"
```

---

## Task 5: PokemonCacheService (TDD, unit-level)

**Files:**
- Test: `apps/api/src/pokemon/pokemon-cache.service.spec.ts`
- Create: `apps/api/src/pokemon/pokemon-cache.service.ts`

Service responsibilities (spec §4.4):
- `search({ page, limit, search })` → `{ items, total, page, limit }` against the cache, optionally filtered by case-insensitive `name` substring.
- `getOneByIdOrName(idOrName)` → reads from cache; if the doc is a stub (no weight/sprite), invokes `PokeApiClient.fetchOne` and persists the enrichment before returning.
- `warmup(limit)` → fetches the full PokéAPI index via the client and inserts missing stub docs (`{ id, name }`).

This is a pure-Mongo + pure-client unit; the model and the client are mocked.

- [ ] **Step 1: Write the failing service spec (red)**

Create `apps/api/src/pokemon/pokemon-cache.service.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails (red)**

```bash
npm test -w @pokemon/api -- --testPathPattern=pokemon-cache.service
```

Expected: FAIL — module not found.

- [ ] **Step 3: Commit the red state**

```bash
git add apps/api/src/pokemon/pokemon-cache.service.spec.ts
git commit -m "test(api): add failing pokemon cache service spec (red)"
```

- [ ] **Step 4: Implement the service (green)**

Create `apps/api/src/pokemon/pokemon-cache.service.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests to verify they pass (green)**

```bash
npm test -w @pokemon/api -- --testPathPattern=pokemon-cache.service
```

Expected: 7 service tests pass.

- [ ] **Step 6: Commit the green state**

```bash
git add apps/api/src/pokemon/pokemon-cache.service.ts
git commit -m "feat(api): implement pokemon cache service (green)"
```

---

## Task 6: PokemonModule + warmup hook + DTO

**Files:**
- Create: `apps/api/src/pokemon/pokemon.module.ts`
- Create: `apps/api/src/pokemon/dto/list-pokemon.query.dto.ts`
- Modify: `apps/api/src/app.module.ts`

`OnModuleInit` calls `warmup(2000)` on real boot but is a no-op when `WARMUP_DISABLED=1` (used in e2e tests).

- [ ] **Step 1: Define the query DTO**

Create `apps/api/src/pokemon/dto/list-pokemon.query.dto.ts`:

```ts
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListPokemonQueryDto {
  @Transform(({ value }) => (value === undefined ? 1 : Number(value)))
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => (value === undefined ? 20 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  search?: string;
}
```

- [ ] **Step 2: Define the module**

Create `apps/api/src/pokemon/pokemon.module.ts`:

```ts
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PokemonCache,
  PokemonCacheSchema,
} from './schemas/pokemon-cache.schema';
import { PokeApiClient } from './poke-api.client';
import { PokemonCacheService } from './pokemon-cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PokemonCache.name, schema: PokemonCacheSchema },
    ]),
  ],
  providers: [PokeApiClient, PokemonCacheService],
  exports: [PokemonCacheService],
})
export class PokemonModule implements OnModuleInit {
  private readonly logger = new Logger(PokemonModule.name);

  constructor(
    private readonly cache: PokemonCacheService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('WARMUP_DISABLED') === '1') {
      return;
    }
    try {
      await this.cache.warmup(2000);
    } catch (err) {
      this.logger.warn(`Pokemon cache warmup failed: ${(err as Error).message}`);
    }
  }
}
```

(`PokemonController` is added in Task 7 — keep this module minimal until then.)

- [ ] **Step 3: Wire the module into AppModule**

Edit `apps/api/src/app.module.ts` so the imports list includes `PokemonModule`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { PokemonModule } from './pokemon/pokemon.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGO_URI') ??
          'mongodb://localhost:27017/pokemon',
      }),
    }),
    CommonModule,
    HealthModule,
    PokemonModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Build to verify**

```bash
npm run build -w @pokemon/api
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/pokemon/pokemon.module.ts \
        apps/api/src/pokemon/dto/list-pokemon.query.dto.ts \
        apps/api/src/app.module.ts
git commit -m "feat(api): wire pokemon module with warmup hook"
```

---

## Task 7: PokemonController + e2e (in-memory mongo)

**Files:**
- Create: `apps/api/src/test-utils/mongo-test-module.ts`
- Create: `apps/api/src/test-utils/pokeapi-fixtures.ts`
- Test: `apps/api/src/pokemon/pokemon.controller.spec.ts`
- Create: `apps/api/src/pokemon/pokemon.controller.ts`
- Modify: `apps/api/src/pokemon/pokemon.module.ts` (add the controller)

- [ ] **Step 1: Build the in-memory mongo factory**

Create `apps/api/src/test-utils/mongo-test-module.ts`:

```ts
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

export const startInMemoryMongo = async (): Promise<string> => {
  mongod = await MongoMemoryServer.create();
  return mongod.getUri();
};

export const stopInMemoryMongo = async (): Promise<void> => {
  await mongod?.stop();
  mongod = undefined;
};

export const inMemoryMongoModule = (uri: string): ReturnType<typeof MongooseModule.forRoot> => {
  const options: MongooseModuleOptions = { uri };
  return MongooseModule.forRoot(options.uri ?? '', options);
};
```

- [ ] **Step 2: Add deterministic PokéAPI fixtures**

Create `apps/api/src/test-utils/pokeapi-fixtures.ts`:

```ts
import type { PokeDetail, PokeIndexEntry } from '../pokemon/poke-api.client';

export const indexFixture: PokeIndexEntry[] = [
  { id: 1, name: 'bulbasaur' },
  { id: 4, name: 'charmander' },
  { id: 7, name: 'squirtle' },
  { id: 25, name: 'pikachu' },
];

export const detailFixtures: Record<string, PokeDetail> = {
  '1': { id: 1, name: 'bulbasaur', weight: 69, sprite: 'b.png', types: ['grass'] },
  '4': { id: 4, name: 'charmander', weight: 85, sprite: 'c.png', types: ['fire'] },
  '7': { id: 7, name: 'squirtle', weight: 90, sprite: 's.png', types: ['water'] },
  '25': { id: 25, name: 'pikachu', weight: 60, sprite: 'p.png', types: ['electric'] },
};

export const fakePokeApiClient = () => ({
  fetchIndex: jest.fn().mockResolvedValue(indexFixture),
  fetchOne: jest.fn().mockImplementation(async (key: number | string) => {
    const detail = detailFixtures[String(key)];
    if (!detail) throw new Error(`No fixture for ${key}`);
    return detail;
  }),
});
```

- [ ] **Step 3: Write the failing controller spec (red)**

Create `apps/api/src/pokemon/pokemon.controller.spec.ts`:

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
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
```

- [ ] **Step 4: Run the test to verify it fails (red)**

```bash
npm test -w @pokemon/api -- --testPathPattern=pokemon.controller
```

Expected: FAIL — controller module not found.

- [ ] **Step 5: Commit the red state**

```bash
git add apps/api/src/test-utils \
        apps/api/src/pokemon/pokemon.controller.spec.ts
git commit -m "test(api): add failing pokemon controller e2e (red)"
```

- [ ] **Step 6: Implement the controller**

Create `apps/api/src/pokemon/pokemon.controller.ts`:

```ts
import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PokemonCacheService } from './pokemon-cache.service';
import { ListPokemonQueryDto } from './dto/list-pokemon.query.dto';

@Controller('pokemon')
export class PokemonController {
  constructor(private readonly cache: PokemonCacheService) {}

  @Get()
  list(@Query() query: ListPokemonQueryDto) {
    return this.cache.search(query);
  }

  @Get(':idOrName')
  async getOne(@Param('idOrName') idOrName: string) {
    try {
      return await this.cache.getOneByIdOrName(idOrName);
    } catch (err) {
      throw new NotFoundException((err as Error).message);
    }
  }
}
```

- [ ] **Step 7: Wire the controller into PokemonModule**

Edit `apps/api/src/pokemon/pokemon.module.ts`, add `controllers: [PokemonController]` and the import:

```ts
import { PokemonController } from './pokemon.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PokemonCache.name, schema: PokemonCacheSchema },
    ]),
  ],
  controllers: [PokemonController],
  providers: [PokeApiClient, PokemonCacheService],
  exports: [PokemonCacheService],
})
export class PokemonModule implements OnModuleInit { /* unchanged body */ }
```

- [ ] **Step 8: Run the tests to verify they pass (green)**

```bash
npm test -w @pokemon/api -- --testPathPattern=pokemon.controller
```

Expected: 5 e2e tests pass.

- [ ] **Step 9: Commit the green state**

```bash
git add apps/api/src/pokemon/pokemon.controller.ts \
        apps/api/src/pokemon/pokemon.module.ts
git commit -m "feat(api): implement pokemon controller (green)"
```

---

## Task 8: List schema + DTO

**Files:**
- Create: `apps/api/src/lists/schemas/list.schema.ts`
- Create: `apps/api/src/lists/dto/create-list.dto.ts`

`List` embeds `PokemonSnapshot[]`. `createdAt` is auto-managed by Mongoose timestamps. Document layout matches spec §4.3.

- [ ] **Step 1: Define the schema**

Create `apps/api/src/lists/schemas/list.schema.ts`:

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class PokemonSnapshotEmbed {
  @Prop({ required: true })
  pokemonId!: number;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  weight!: number;

  @Prop({ required: true })
  sprite!: string;
}

const PokemonSnapshotEmbedSchema =
  SchemaFactory.createForClass(PokemonSnapshotEmbed);

@Schema({ collection: 'lists', timestamps: { createdAt: true, updatedAt: false } })
export class List {
  @Prop({ required: true, minlength: 1, maxlength: 80 })
  name!: string;

  @Prop({ type: [PokemonSnapshotEmbedSchema], default: [] })
  items!: PokemonSnapshotEmbed[];

  createdAt!: Date;
}

export type ListDocument = HydratedDocument<List>;
export const ListSchema = SchemaFactory.createForClass(List);
ListSchema.index({ createdAt: -1 });
```

- [ ] **Step 2: Define the create DTO**

Create `apps/api/src/lists/dto/create-list.dto.ts`:

```ts
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateListDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  pokemonIds!: number[];
}
```

- [ ] **Step 3: Build to verify**

```bash
npm run build -w @pokemon/api
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lists/schemas apps/api/src/lists/dto
git commit -m "feat(api): add list schema and create dto"
```

---

## Task 9: ListsService — create / find / remove (TDD, unit-level)

**Files:**
- Test: `apps/api/src/lists/lists.service.spec.ts`
- Create: `apps/api/src/lists/lists.service.ts`

The service uses `PokemonCacheService.getOneByIdOrName` to snapshot each requested id, then runs `ListValidator.validate` from `@pokemon/shared`. Domain errors translate to `ValidationException`.

- [ ] **Step 1: Write the failing service spec (red)**

Create `apps/api/src/lists/lists.service.spec.ts`:

```ts
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
      cache.getOneByIdOrName.mockResolvedValueOnce({
        id: 25,
        name: 'pikachu',
        weight: 2000,
        sprite: 'p.png',
        types: [],
      });

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
```

- [ ] **Step 2: Run the test to verify it fails (red)**

```bash
npm test -w @pokemon/api -- --testPathPattern=lists.service
```

Expected: FAIL — module not found.

- [ ] **Step 3: Commit the red state**

```bash
git add apps/api/src/lists/lists.service.spec.ts
git commit -m "test(api): add failing lists service spec (red)"
```

- [ ] **Step 4: Implement the service**

Create `apps/api/src/lists/lists.service.ts`:

```ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ListValidator, type ListFileV1 } from '@pokemon/shared';
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

  async remove(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).lean();
    if (!result) throw new NotFoundException(`List ${id} not found.`);
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
```

- [ ] **Step 5: Run the tests to verify they pass (green)**

```bash
npm test -w @pokemon/api -- --testPathPattern=lists.service
```

Expected: 5 service tests pass.

- [ ] **Step 6: Commit the green state**

```bash
git add apps/api/src/lists/lists.service.ts
git commit -m "feat(api): implement lists service with shared validator (green)"
```

---

## Task 10: ListsController + e2e for `POST /lists`, `GET /lists`, `GET /lists/:id`, `DELETE /lists/:id`

**Files:**
- Test: `apps/api/src/lists/lists.controller.spec.ts`
- Create: `apps/api/src/lists/lists.controller.ts`
- Create: `apps/api/src/lists/lists.module.ts`
- Modify: `apps/api/src/app.module.ts`

This task wires the controller for the four CRUD-ish routes; download (Task 11) and upload (Task 12) extend the same controller.

- [ ] **Step 1: Define the module (controller comes next, but the module needs to exist for tests to import)**

Create `apps/api/src/lists/lists.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { List, ListSchema } from './schemas/list.schema';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { PokemonModule } from '../pokemon/pokemon.module';

@Module({
  imports: [
    PokemonModule,
    MongooseModule.forFeature([{ name: List.name, schema: ListSchema }]),
  ],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
```

- [ ] **Step 2: Wire `ListsModule` into the root**

Edit `apps/api/src/app.module.ts` so `imports` includes `ListsModule`:

```ts
import { ListsModule } from './lists/lists.module';

// ...inside imports:
ListsModule,
```

- [ ] **Step 3: Write the failing controller spec (red)**

Create `apps/api/src/lists/lists.controller.spec.ts`:

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
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
});
```

- [ ] **Step 4: Run the test to verify it fails (red)**

```bash
npm test -w @pokemon/api -- --testPathPattern=lists.controller
```

Expected: FAIL — `ListsController` not exported.

- [ ] **Step 5: Commit the red state**

```bash
git add apps/api/src/lists/lists.module.ts \
        apps/api/src/lists/lists.controller.spec.ts \
        apps/api/src/app.module.ts
git commit -m "test(api): add failing lists crud e2e (red)"
```

- [ ] **Step 6: Implement the controller (CRUD only — download/upload land in Tasks 11–12)**

Create `apps/api/src/lists/lists.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';

@Controller('lists')
export class ListsController {
  constructor(private readonly service: ListsService) {}

  @Post()
  create(@Body() dto: CreateListDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAllSummaries();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

- [ ] **Step 7: Run the tests to verify they pass (green)**

```bash
npm test -w @pokemon/api -- --testPathPattern=lists.controller
```

Expected: 7 e2e tests pass.

- [ ] **Step 8: Commit the green state**

```bash
git add apps/api/src/lists/lists.controller.ts
git commit -m "feat(api): implement lists crud endpoints (green)"
```

---

## Task 11: `GET /lists/:id/download` (file streaming)

**Files:**
- Modify: `apps/api/src/lists/lists.service.ts` (add `toFile`)
- Modify: `apps/api/src/lists/lists.controller.ts` (add `download`)
- Modify: `apps/api/src/lists/lists.controller.spec.ts` (add the download case)

The endpoint streams `ListFileCodec.encode(...)` JSON with `Content-Disposition: attachment` and a filename derived from the list name (sanitized).

- [ ] **Step 1: Extend the service with `toFile`**

Add to `apps/api/src/lists/lists.service.ts`:

```ts
import { ListFileCodec } from '@pokemon/shared';

// inside ListsService:
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
  const safe = doc.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'list';
  return { filename: `${safe}.json`, payload };
}
```

- [ ] **Step 2: Extend the controller with the download route**

Add to `apps/api/src/lists/lists.controller.ts`:

```ts
import { Header, Res } from '@nestjs/common';
import type { Response } from 'express';

// inside ListsController:
@Get(':id/download')
async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
  const { filename, payload } = await this.service.toFile(id);
  res
    .status(200)
    .setHeader('Content-Type', 'application/json; charset=utf-8')
    .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    .send(payload);
}
```

- [ ] **Step 3: Add the failing test case (red)**

Append to `apps/api/src/lists/lists.controller.spec.ts` inside the existing `describe`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it now passes (green — service + controller already wired in steps 1-2 above)**

```bash
npm test -w @pokemon/api -- --testPathPattern=lists.controller
```

Expected: all e2e tests pass (8 total in this file).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lists/lists.service.ts \
        apps/api/src/lists/lists.controller.ts \
        apps/api/src/lists/lists.controller.spec.ts
git commit -m "feat(api): add list download endpoint"
```

---

## Task 12: `POST /lists/upload` (multipart file import)

**Files:**
- Modify: `apps/api/src/lists/lists.controller.ts` (add `upload`)
- Modify: `apps/api/src/lists/lists.controller.spec.ts` (add three upload cases)

Multipart upload with a single field `file`. We parse with `ListFileCodec.decode`; on `INVALID_FILE_FORMAT` / `UNSUPPORTED_FILE_VERSION` raise `FormatException`. Otherwise hand off to `ListsService.createFromFile`.

- [ ] **Step 1: Extend the controller with the upload route**

Add to `apps/api/src/lists/lists.controller.ts`:

```ts
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ListFileCodec } from '@pokemon/shared';
import { FormatException } from '../common/exceptions/format.exception';

// inside ListsController:
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file: Express.Multer.File) {
  if (!file) {
    throw new FormatException({
      code: 'INVALID_FILE_FORMAT',
      message: 'Upload must include a "file" field.',
    });
  }
  const decoded = ListFileCodec.decode(file.buffer.toString('utf8'));
  if (!decoded.ok) {
    throw new FormatException(decoded.error);
  }
  return this.service.createFromFile(decoded.value);
}
```

- [ ] **Step 2: Add the failing test cases (red)**

Append to `apps/api/src/lists/lists.controller.spec.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it passes (green — handler already wired in step 1)**

```bash
npm test -w @pokemon/api -- --testPathPattern=lists.controller
```

Expected: 12 e2e tests in this file pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lists/lists.controller.ts \
        apps/api/src/lists/lists.controller.spec.ts
git commit -m "feat(api): add list upload endpoint"
```

---

## Task 13: README — API reference + run notes

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add an API reference section after the Architecture decisions block**

Append to `README.md`:

```markdown

## API reference

All routes are mounted under `/api`. Errors share the envelope `{ statusCode, errors: [{ code, message }] }`.

| Method | Path                            | Description                                                |
|-------:|---------------------------------|------------------------------------------------------------|
| GET    | `/api/health`                   | Liveness probe — `{ "status": "ok" }`                      |
| GET    | `/api/pokemon`                  | Paginated catalog (`?page=&limit=&search=`).               |
| GET    | `/api/pokemon/:idOrName`        | Single Pokémon — fills the cache from PokéAPI on miss.     |
| GET    | `/api/lists`                    | All saved lists (id, name, itemCount, totalWeight).        |
| POST   | `/api/lists`                    | Create from `{ name, pokemonIds[] }` — server validates.   |
| GET    | `/api/lists/:id`                | Full list detail.                                          |
| DELETE | `/api/lists/:id`                | Delete a list (204).                                       |
| GET    | `/api/lists/:id/download`       | Stream list as a v1 JSON attachment.                       |
| POST   | `/api/lists/upload`             | Multipart upload of a v1 JSON file → validate and persist. |

Validation codes: `MIN_SPECIES`, `WEIGHT_EXCEEDED`, `INVALID_FILE_FORMAT`, `UNSUPPORTED_FILE_VERSION`, `VALIDATION_ERROR` (DTO-level), `INTERNAL_ERROR`.

The Pokémon catalog warms up against PokéAPI on first boot. To skip warmup (for tests), set `WARMUP_DISABLED=1`.
```

- [ ] **Step 2: Run the full backend test suite once more**

```bash
npm test -w @pokemon/api
```

Expected: all api tests pass — health (1) + filter (4) + poke-api client (5) + cache service (7) + pokemon controller (5) + lists service (5) + lists controller (12) = **39 tests**.

- [ ] **Step 3: Verify the dev stack still boots end-to-end**

```bash
docker compose up -d
until curl -s -f http://localhost:3000/api/health -o /tmp/h.json; do sleep 3; done
cat /tmp/h.json    # → {"status":"ok"}
docker compose down
```

Expected: `{"status":"ok"}` after `api` finishes booting.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document api reference"
```

---

## Exit criteria

- All endpoints from spec §4.2 implemented and integration-tested:
  - `GET /api/pokemon`, `GET /api/pokemon/:idOrName`
  - `GET /api/lists`, `POST /api/lists`, `GET /api/lists/:id`, `DELETE /api/lists/:id`
  - `GET /api/lists/:id/download`, `POST /api/lists/upload`
- Every error response uses the `{ statusCode, errors: [{ code, message }] }` envelope.
- `ListValidator` and `ListFileCodec` are imported from `@pokemon/shared` — no duplicated rules in the API.
- `mongodb-memory-server` powers the e2e tests; no real Mongo or PokéAPI is contacted in `npm test`.
- `npm test -w @pokemon/api` is green; `npm run build -w @pokemon/api` is green.
- `docker compose up` boots Mongo (healthy) + API; `GET /api/health` returns `{"status":"ok"}`.

## Out of scope for this plan

- Web UI consuming the API — Plan 3.
- Production multi-stage Dockerfiles + nginx reverse proxy — Plan 4.
- Authentication, rate limiting, observability beyond the existing logger — out of spec.
- Pokémon detail enrichment beyond what the catalog needs (abilities, moves, evolutions) — out of spec.
