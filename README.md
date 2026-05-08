# Pokemon Collections

Build, save, validate, share, and re-import custom Pokemon lists. Source data comes from the public PokeAPI.

This is a workspace monorepo with three packages:

- `apps/api` — NestJS HTTP API.
- `apps/web` — React + Vite SPA.
- `packages/shared` — types, file codec, and list validation rules used by both apps.

## Quick start (Docker)

Requirements: Docker Desktop, Colima, OrbStack, or Rancher Desktop with Compose v2.

```bash
docker compose up
```

Once the stack is healthy:

- Web: <http://localhost:5173>
- API health: <http://localhost:3000/health> -> `{"status":"ok"}`
- Mongo: `mongodb://localhost:27017/pokemon`

The first run installs all dependencies inside the `api` and `web` containers and may take a couple of minutes. Subsequent runs reuse the volume cache.

## Local development (no Docker)

Requires Node 22+.

```bash
npm install
npm run build -w @pokemon/shared    # the shared package builds to dist/
npm run start:dev -w @pokemon/api   # API on :3000
npm run dev -w @pokemon/web         # Web on :5173 (proxies /api -> :3000)
```

## Tests

```bash
npm test                            # runs every workspace's test script
npm test -w @pokemon/shared         # 15 tests: codec + validator
npm test -w @pokemon/api            # health controller test
npm test -w @pokemon/web            # App smoke test
```

## Layout

```
apps/api          NestJS API (modules, controllers, services)
apps/web          Vite + React SPA
packages/shared   Cross-cutting types, file codec, list rules
docker-compose.yml   mongo + dev api + dev web
```

## Architecture decisions

- **npm workspaces monorepo.** API, Web, and the shared library live in one repo so types, validation rules, and the import/export file format stay byte-identical on both sides of the wire. Cross-cutting changes ship in a single PR with one CI run.
- **`packages/shared` carries the contract.** `PokemonSnapshot`, `ListFileV1`, `ListFileCodec`, and `ListValidator` are the source of truth. Backend and frontend both import the published `dist/` and never duplicate the rules — no drift between server-side rejection and client-side hints.
- **Versioned list-file schema (`schemaVersion: 1`).** The codec emits a tagged document and decodes via Zod, distinguishing *invalid format* from *unsupported version*. Future schema changes get a new code path instead of breaking old saved files.
- **Validation is pure and result-shaped.** `ListValidator.validate` returns `{ ok: true } | { ok: false, errors }` with stable `code` + human `message` per error. Both rules (≥3 unique species, ≤1300 hg total weight) are checked independently so the UI can surface every violation at once instead of drip-feeding them.
- **TDD for the shared library.** Codec and validator were red-then-green: failing spec committed first, implementation second. The git log preserves that loop so reviewers can replay it.
- **NestJS for the API, Vite + React for the Web.** Nest gives DI and module boundaries for a CRUD service that will grow real Mongo collections in Plan 2. Vite gives fast dev/HMR and a tiny prod build for what is fundamentally a single-page form-and-list UI in Plan 3.
- **Dev compose runs bare `node:22-alpine` containers** that bind-mount the repo and run `npm install && start:dev` / `vite` on first boot. This keeps the developer loop identical to running locally (no rebuild on code change) and keeps Plan 1 free of multi-stage Dockerfiles, which arrive only when Plan 4 adds the production image.
- **Mongo is provisioned now, even though no API uses it yet.** Wiring it in compose with a healthcheck (`start_period: 60s` to absorb cold-start WiredTiger recovery) means Plan 2 just imports `MongooseModule` against an already-working URI — no infra delta in that plan.
- **Strict TypeScript, ESLint flat config, Prettier, and a per-workspace `tsconfig` extending one root `tsconfig.base.json`.** Compiler invariants (`strict`, `target`, etc.) live in one place; each workspace overrides only what it must (`module`, `jsx`, `composite`).

The full feature set (Pokemon catalog, list CRUD, file import/export) is delivered in subsequent plans. This commit marks the foundation: working dev stack, shared validation library with full unit-test coverage, and per-workspace toolchain wiring.
