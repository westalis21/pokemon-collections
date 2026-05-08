# Pokémon Collections — Design Spec

**Date:** 2026-05-08
**Status:** approved (pending implementation plan)

## 1. Goal

Build a small full-stack web application that lets users compose, save, browse, download, and re-import custom Pokémon collections, sourced from the public PokéAPI. The deliverable is a public Git repository runnable locally with `docker compose up --build`.

## 2. Functional Requirements

### 2.1 Pages and flows
- **Home (`/`)** — show all saved lists; primary actions: *Create New List*, *Upload from File*.
- **New list (`/lists/new`)** — browse a paginated, searchable Pokémon catalog; toggle items into the current selection; show running totals (weight, unique species); save when valid; can also pre-populate the selection by uploading a saved file.
- **List detail (`/lists/:id`)** — show the contents of a saved list with a *Download* action that streams the list as a JSON file.

### 2.2 Validation rules
A list is **valid** if and only if:
1. It contains at least **3 Pokémon of different species** (uniqueness by `pokemonId`).
2. The total weight of selected Pokémon is **≤ 1300 hectograms**.

Validation runs on the server for both `POST /lists` and `POST /lists/upload`. Failure responses must include machine-readable codes (`MIN_SPECIES`, `WEIGHT_EXCEEDED`) and human-readable messages so the UI can render an actionable banner.

### 2.3 File format (export/import)
JSON, schema-versioned. v1 shape:

```json
{
  "schemaVersion": 1,
  "name": "My team",
  "items": [
    { "pokemonId": 25, "name": "pikachu", "weight": 60 }
  ]
}
```

`POST /lists/upload` rejects unknown `schemaVersion` with code `UNSUPPORTED_FILE_VERSION` and rejects malformed JSON / missing fields with `INVALID_FILE_FORMAT`. After format validation, the same `ListValidator` runs on the file's items.

## 3. Architecture

Monorepo using npm workspaces.

```
pokemon/
├── apps/
│   ├── api/                      NestJS + TypeScript + Mongoose
│   └── web/                      Vite + React + TS + Tailwind + TanStack Query
├── packages/
│   └── shared/                   Cross-cutting types and codecs
├── docker-compose.yml            api + web + mongo
├── package.json                  workspaces
└── README.md
```

Communication: `web → REST → api → (Mongo + PokéAPI)`. The web app never calls PokéAPI directly. The web bundle is built by Vite and served by nginx, which also reverse-proxies `/api` to the NestJS service inside the compose network.

### 3.1 Why these choices
- **Monorepo with workspaces** — single `docker compose up`, shared types between client and server, easier review.
- **NestJS** — module structure encourages domain boundaries (PokemonModule vs ListsModule), built-in DI/testing, idiomatic Jest setup.
- **MongoDB + Mongoose** — required by the assignment; document model fits the snapshot-based list shape naturally.
- **Vite + React + TanStack Query** — minimal config, query caching for the catalog reduces PokéAPI pressure further on the client side, no SSR overhead since the app has no SEO concerns.
- **Tailwind** — utility-first styling without an opinionated component library; small footprint for a test assignment.
- **No auth** — not in the assignment; out of scope.

## 4. Backend (apps/api)

### 4.1 Modules
- **PokemonModule** — catalog and PokéAPI proxy.
- **ListsModule** — list CRUD, validation, file import/export.
- **CommonModule** — global exception filter, validation pipe configuration, logging.

### 4.2 HTTP API

| Method | Path                          | Description |
|-------:|-------------------------------|-------------|
| GET    | `/api/pokemon?page=&limit=&search=` | Paginated catalog (id, name, weight, sprite, types). |
| GET    | `/api/pokemon/:idOrName`      | Single Pokémon detail. |
| GET    | `/api/lists`                  | All saved lists (id, name, itemCount, totalWeight, createdAt). |
| POST   | `/api/lists`                  | Create a list from `{ name, pokemonIds: number[] }`. |
| GET    | `/api/lists/:id`              | Full list with snapshot items. |
| DELETE | `/api/lists/:id`              | Remove a list. |
| GET    | `/api/lists/:id/download`     | Stream list as v1 JSON file with `Content-Disposition: attachment`. |
| POST   | `/api/lists/upload`           | Multipart upload of a v1 JSON file → validates and persists. |

Error envelope (consistent across endpoints):
```json
{ "statusCode": 400, "errors": [ { "code": "MIN_SPECIES", "message": "List must contain at least 3 different species." } ] }
```

### 4.3 Data model (Mongoose)

```ts
// PokemonSnapshot (embedded)
{ pokemonId: number, name: string, weight: number, sprite: string }

// List
{ _id: ObjectId, name: string (1..80), items: PokemonSnapshot[], createdAt: Date }

// PokemonCache
{ id: number (unique), name: string (indexed), weight: number, sprite: string, types: string[], fetchedAt: Date }
```

Indexes: `PokemonCache.id` unique, `PokemonCache.name` for search, `List.createdAt` desc for home page sort.

### 4.4 Pokémon catalog strategy
- **Read path:** controller → `PokemonCacheService.search(page, limit, search)`.
- **Cache miss / cold start:** on `OnModuleInit`, the warmup task fetches the index list (`?limit=2000`) and writes stub documents `{ id, name }` if missing — this enables search+pagination immediately.
- **Detail fill-in:** when the catalog returns a stub (no `weight`), `PokeApiClient.fetchOne(id)` is invoked and the document is updated with full fields. The fill-in is fire-and-forget batched at request time so the user gets a usable response quickly while later pages are enriched.
- **No TTL** — Pokémon stats are effectively immutable.

### 4.5 Validation flow
- HTTP-level: `class-validator` on DTOs (string lengths, types, required fields).
- Domain-level: `ListValidator.validate(items: PokemonSnapshot[])` returns `{ ok: true } | { ok: false, errors: ListValidationError[] }`. Used by both `POST /lists` and `POST /lists/upload`. Always returns *all* failing rules at once (no short-circuit) so the UI can show a complete picture.
- `ListFileCodec` (in `packages/shared`) handles `encode(list) → JSON` and `decode(json) → ParsedList | FormatError`. Used by both server and client.

### 4.6 Folder structure (api)
```
src/
├── pokemon/
│   ├── pokemon.module.ts
│   ├── pokemon.controller.ts
│   ├── pokemon.service.ts
│   ├── pokemon-cache.service.ts
│   ├── poke-api.client.ts
│   └── schemas/pokemon-cache.schema.ts
├── lists/
│   ├── lists.module.ts
│   ├── lists.controller.ts
│   ├── lists.service.ts
│   ├── list-validator.ts
│   ├── dto/
│   └── schemas/list.schema.ts
├── common/
│   ├── exceptions/
│   ├── filters/http-exception.filter.ts
│   └── pipes/
└── main.ts
test/  # e2e specs
```

## 5. Frontend (apps/web)

### 5.1 Pages and components
- `pages/HomePage.tsx` — list cards, *Create New List*, *Upload from File*.
- `pages/NewListPage.tsx` — left: catalog (search + pagination); right: selection panel (`SelectedPanel`, `WeightMeter`), Save button.
- `pages/ListDetailPage.tsx` — list contents + Download button.
- Reusable: `PokemonCard`, `ListCard`, `WeightMeter`, `FileUploader`, `ErrorBanner`.

### 5.2 State and data layer
- TanStack Query for all server state (catalog, lists, list detail).
- `useListBuilder` hook (reducer-based) for the selection in *New list* — actions: `toggle`, `setFromFile`, `clear`.
- Debounced search input (300ms).
- MSW for API mocking in component/integration tests.

### 5.3 Folder structure (web)
```
src/
├── pages/
├── components/
├── hooks/{useListBuilder,usePokemonCatalog}.ts
├── api/{client,pokemon,lists}.ts
├── lib/validation.ts
├── App.tsx, main.tsx, router.tsx
```

### 5.4 UX details
- Loading skeletons in catalog grid.
- *Save* shows all validation errors as a single banner, scrolled into view.
- Upload flow displays a preview of parsed items before final save (so users see what they're about to commit to).
- Confirm dialog before *Delete*.

## 6. Shared package (packages/shared)

```
packages/shared/src/
├── types/
│   ├── pokemon.ts            PokemonSnapshot
│   └── list-file.ts          ListFileV1, FormatError, codes
├── codecs/list-file.codec.ts encode/decode + schema validation (zod)
└── validation/list-rules.ts  pure ListValidator usable on both sides
```

Both `apps/api` and `apps/web` import from `@pokemon/shared`. Single source of truth for types and rule logic.

## 7. Testing (TDD)

### 7.1 Backend (Jest)
- Unit
  - `ListValidator`: `<3` species, duplicate species (3 same → fails MIN_SPECIES), weight=1300 (passes), weight=1301 (fails), empty, valid case, both rules failing simultaneously → returns both errors.
  - `ListFileCodec`: encode/decode v1 round-trip, unknown `schemaVersion` → `UNSUPPORTED_FILE_VERSION`, malformed JSON → `INVALID_FILE_FORMAT`, missing fields → `INVALID_FILE_FORMAT`.
  - `PokemonCacheService`: cache hit returns local document, cache miss invokes client and persists.
- Integration / e2e (NestJS testing module + `mongodb-memory-server` + mocked `PokeApiClient`)
  - `POST /lists` happy path → 201.
  - `POST /lists` failing each rule → 400 + correct codes.
  - `POST /lists/upload` v1 → 201.
  - `POST /lists/upload` invalid JSON → 400.
  - `POST /lists/upload` unknown version → 400.
  - `GET /lists/:id/download` → headers + body match.
  - `GET /pokemon` paginated and searchable.

### 7.2 Frontend (Vitest + React Testing Library + MSW)
- Hooks: `useListBuilder` reducer transitions, derived weight/species counts.
- Components: `WeightMeter` rendering by progress, `PokemonCard` selected/unselected, `FileUploader` happy/error paths.
- Page integration: `NewListPage` — pick three Pokémon from MSW catalog, save, assert API call payload and navigation; failure variant shows error banner.

### 7.3 Shared package
- `list-file.codec` and `list-rules` tested once in `packages/shared` and re-used by both apps via direct import.

### 7.4 No browser e2e
Out of scope for the test assignment; covered enough by integration tests on both sides.

## 8. Docker

### 8.1 docker-compose.yml
```yaml
services:
  mongo:
    image: mongo:7
    volumes: [ mongo-data:/data/db ]
    healthcheck: ...
  api:
    build: { context: ., dockerfile: apps/api/Dockerfile }
    environment:
      MONGO_URI: mongodb://mongo:27017/pokemon
      PORT: 3000
    depends_on: { mongo: { condition: service_healthy } }
  web:
    build: { context: ., dockerfile: apps/web/Dockerfile }
    ports: [ "8080:80" ]
    depends_on: [ api ]
volumes: { mongo-data: {} }
```

### 8.2 Dockerfiles
- `apps/api/Dockerfile` — multi-stage: `node:20-alpine` (deps + build) → runtime with `dist/` and prod deps.
- `apps/web/Dockerfile` — multi-stage: build with Vite → `nginx:alpine` serving `dist/` plus `nginx.conf` that reverse-proxies `/api` to `api:3000`.

### 8.3 Compatibility
- Standard Compose v2 syntax. No BuildKit-specific features. Works with Docker Desktop, Colima, OrbStack, Rancher Desktop.
- `docker compose up --build` is the only command a reviewer needs.

## 9. README

Single top-level `README.md` covering:
- Quick start: `docker compose up --build` → http://localhost:8080.
- Tech stack and architectural decisions (monorepo, NestJS modules, snapshot list model, schema-versioned files, server-side validation, Mongo-backed PokéAPI cache).
- API reference table.
- How to run tests: `npm test` from root.
- Folder map.

## 10. Out of scope
- Authentication / user accounts.
- Pokémon detail enrichment beyond what the catalog needs (abilities, moves, evolutions).
- Hosting / CI/CD pipelines.
- Browser end-to-end tests.
- i18n.

## 11. Atomic commit plan (overview)
The implementation plan will translate this into red-green-refactor commits. Approximate sequence:
1. `chore: init monorepo with workspaces`
2. `chore: add docker-compose and mongo service`
3. `chore: scaffold nest api app`
4. `chore: scaffold vite web app`
5. `feat(shared): add types and list file codec v1`
6. `feat(shared): add list validator rules`
7. `feat(api): add pokemon cache schema and service`
8. `feat(api): add poke-api client with cache fill-in`
9. `feat(api): add GET /pokemon catalog endpoint`
10. `feat(api): add list schema and service`
11. `feat(api): add POST /lists with validation`
12. `feat(api): add GET /lists and GET /lists/:id`
13. `feat(api): add list download endpoint`
14. `feat(api): add list upload endpoint`
15. `feat(web): add api client and query hooks`
16. `feat(web): add home page with saved lists`
17. `feat(web): add new list page with catalog`
18. `feat(web): add selection panel and weight meter`
19. `feat(web): wire save with server-side validation errors`
20. `feat(web): add list detail and download`
21. `feat(web): add upload from file`
22. `chore: add Dockerfiles for api and web`
23. `chore: add nginx reverse proxy config`
24. `docs: add README with setup and architecture`

Each commit must end with a green test suite for the relevant workspace.
