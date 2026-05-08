# Foundation & Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Pokemon Collections monorepo with `apps/api` (Nest hello-world + `/health`), `apps/web` (Vite + React hello-world), `packages/shared` (`PokemonSnapshot`, `ListFileV1`, `ListFileCodec`, `ListValidator` — all TDD), `docker-compose.yml` (Mongo + dev API + dev Web), and a Quick Start README. This is Plan 1 of 4 — backend, frontend, and production Docker land in separate plans.

**Architecture:** npm workspaces monorepo. Shared package compiles to `dist/` and exposes types/codecs/validators to both apps. Dev compose uses bare `node:22-alpine` containers that bind-mount the repo and run `npm install && npm run start:dev` / `vite` (production multi-stage Dockerfiles arrive in Plan 4). Apps in this plan don't yet import from `@pokemon/shared` — that wiring is part of Plans 2 and 3, where backend and frontend gain real functionality.

**Tech Stack:** Node 22, TypeScript 5 strict, ESLint 9 (flat config), Prettier 3, NestJS 11, React 18, Vite 5, Vitest 2, Jest 29 (Nest), Mongo 7, Zod 3, Docker Compose v2.

**Spec:** `docs/superpowers/specs/2026-05-08-pokemon-collections-design.md`

**Constraints (from project memory):**
- All in-code text, commit messages, README, and identifiers in **English**.
- **Never** add `Co-Authored-By: Claude` or any Claude reference to commits, PRs, or README.
- Prefer atomic commits with green tests.

---

## File Structure

```
pokemon/
├── package.json                              workspaces, root scripts (lint, test, format)
├── tsconfig.base.json                        strict shared compiler options
├── eslint.config.mjs                         flat ESLint config (TS-aware)
├── .prettierrc.json
├── .editorconfig
├── .gitignore
├── docker-compose.yml                        mongo + dev api + dev web
├── README.md                                 Quick Start, layout, commands
│
├── apps/
│   ├── api/
│   │   ├── package.json                      Nest 11 deps + scripts
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   ├── nest-cli.json
│   │   └── src/
│   │       ├── main.ts                       bootstrap on PORT
│   │       ├── app.module.ts                 wires HealthModule
│   │       └── health/
│   │           ├── health.module.ts
│   │           ├── health.controller.ts      GET /health → { status: "ok" }
│   │           └── health.controller.spec.ts unit test
│   │
│   └── web/
│       ├── package.json                      Vite + React + Vitest deps
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts                    /api → http://localhost:3000 proxy
│       ├── index.html
│       └── src/
│           ├── main.tsx                      React 18 root
│           ├── App.tsx                       hello-world
│           ├── App.test.tsx                  RTL smoke test
│           └── test/setup.ts                 jest-dom matchers
│
└── packages/
    └── shared/
        ├── package.json                      @pokemon/shared, zod, vitest
        ├── tsconfig.json                     composite, emits to dist/
        ├── vitest.config.ts
        └── src/
            ├── index.ts                      barrel
            ├── types/
            │   ├── pokemon.ts                PokemonSnapshot
            │   └── list-file.ts              ListFileV1, FormatError, FILE_ERROR_CODES
            ├── codecs/
            │   ├── list-file.codec.ts        encode/decode + zod
            │   └── list-file.codec.test.ts
            └── validation/
                ├── list-rules.ts             ListValidator (rules + thresholds)
                └── list-rules.test.ts
```

**Decomposition rationale:**
- One file = one responsibility. `types/`, `codecs/`, and `validation/` are split because the codec depends on types but not on rules, and rules don't depend on the codec — keeping them apart prevents cyclic growth in later plans.
- `health/` is a real Nest module rather than an inline route so that Plan 2 can swap it for production-grade health checks (`@nestjs/terminus`) without churn elsewhere.
- Per-workspace `tsconfig.json` extends the root `tsconfig.base.json` so compiler invariants (strict, target) live in one place.

---

## Task 1: Initialize monorepo root

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`, `.prettierrc.json`, `.editorconfig`, `eslint.config.mjs`

- [ ] **Step 1: Write root `package.json` with npm workspaces**

```json
{
  "name": "pokemon-collections",
  "version": "0.1.0",
  "private": true,
  "description": "Pokemon team list builder (monorepo).",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "eslint": "^9.13.0",
    "prettier": "^3.3.3",
    "typescript": "^5.6.3",
    "typescript-eslint": "^8.12.2"
  }
}
```

- [ ] **Step 2: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
dist/
build/
coverage/

.env
.env.local

.idea/
.vscode/
.DS_Store
*.swp

*.log
npm-debug.log*
```

- [ ] **Step 4: Write `.prettierrc.json`**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

- [ ] **Step 5: Write `.editorconfig`**

```ini
root = true

[*]
indent_style = space
indent_size = 2
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Step 6: Write `eslint.config.mjs`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/build/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
```

- [ ] **Step 7: Install root devDependencies**

Run: `npm install`
Expected: a `package-lock.json` is generated, `node_modules/` populated, no errors.

- [ ] **Step 8: Verify lint runs (no targets yet, should be a no-op success)**

Run: `npx eslint . --max-warnings=0`
Expected: exits 0 (no `.ts`/`.js` files to check beyond the config itself).

- [ ] **Step 9: Verify Prettier passes**

Run: `npx prettier --check .`
Expected: exits 0 with "All matched files use Prettier code style!".

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json eslint.config.mjs \
        .prettierrc.json .editorconfig .gitignore
git commit -m "chore: initialize monorepo with npm workspaces"
```

---

## Task 2: Add `docker-compose.yml` with Mongo

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Write minimal compose file with the Mongo service only**

```yaml
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo-data: {}
```

- [ ] **Step 2: Bring Mongo up in the background**

Run: `docker compose up -d mongo`
Expected: pulls `mongo:7` if needed, container `pokemon-mongo-1` (or similar) starts.

- [ ] **Step 3: Wait for the healthcheck and verify**

Run: `docker compose ps`
Expected: `mongo` shows `(healthy)` within ~30s.

- [ ] **Step 4: Tear down**

Run: `docker compose down`
Expected: container removed; the named volume `mongo-data` is preserved (intentional — kept for later plans).

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add docker-compose with mongo service"
```

---

## Task 3: Scaffold `apps/api` with NestJS and `/health`

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Create: `apps/api/src/health/health.module.ts`, `apps/api/src/health/health.controller.ts`
- Test: `apps/api/src/health/health.controller.spec.ts`
- Modify: `docker-compose.yml` (add `api` service)

- [ ] **Step 1: Write `apps/api/package.json`**

```json
{
  "name": "@pokemon/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "test": "jest"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.13",
    "@types/node": "^22.7.5",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.6.3"
  },
  "jest": {
    "testEnvironment": "node",
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    }
  }
}
```

- [ ] **Step 2: Write `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "commonjs",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictNullChecks": true,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Write `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.e2e-spec.ts"]
}
```

- [ ] **Step 4: Write `apps/api/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

- [ ] **Step 5: Install workspace dependencies**

Run from repo root: `npm install`
Expected: `@pokemon/api` is recognized as a workspace; deps install at the hoisted root `node_modules/`.

- [ ] **Step 6: Write the failing test for `HealthController`**

Create `apps/api/src/health/health.controller.spec.ts`:

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

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm test -w @pokemon/api`
Expected: FAIL with "Cannot find module './health.controller'".

- [ ] **Step 8: Implement `HealthController`**

Create `apps/api/src/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 9: Implement `HealthModule`**

Create `apps/api/src/health/health.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 10: Wire it into the app**

Create `apps/api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
```

Create `apps/api/src/main.ts`:

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `npm test -w @pokemon/api`
Expected: PASS — 1 test passed.

- [ ] **Step 12: Verify production build compiles**

Run: `npm run build -w @pokemon/api`
Expected: exits 0; `apps/api/dist/main.js` exists.

- [ ] **Step 13: Smoke-test the running server locally**

Run (foreground in one terminal): `PORT=3000 node apps/api/dist/main.js`
In another terminal: `curl -s http://localhost:3000/health`
Expected: `{"status":"ok"}`
Stop the server (`Ctrl-C`).

- [ ] **Step 14: Add the `api` service to `docker-compose.yml`**

Edit `docker-compose.yml` so it reads:

```yaml
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: node:22-alpine
    working_dir: /workspace
    command: sh -c "npm install && npm run start:dev -w @pokemon/api"
    environment:
      MONGO_URI: mongodb://mongo:27017/pokemon
      PORT: "3000"
      NODE_ENV: development
    ports:
      - "3000:3000"
    volumes:
      - ./:/workspace
      - /workspace/node_modules
      - /workspace/apps/api/node_modules
    depends_on:
      mongo:
        condition: service_healthy

volumes:
  mongo-data: {}
```

- [ ] **Step 15: Bring up Mongo + API and verify health from outside the compose network**

Run: `docker compose up -d mongo api`
Wait ~30-60s for the first `npm install` inside the container.
Run: `docker compose logs api | tail -n 20`
Expected: a Nest startup line such as `Nest application successfully started`.
Run: `curl -s http://localhost:3000/health`
Expected: `{"status":"ok"}`
Run: `docker compose down`

- [ ] **Step 16: Commit**

```bash
git add apps/api docker-compose.yml package-lock.json
git commit -m "chore: scaffold nest api with health endpoint"
```

---

## Task 4: Scaffold `apps/web` with Vite + React

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/tsconfig.node.json`, `apps/web/vite.config.ts`, `apps/web/index.html`
- Create: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/test/setup.ts`
- Test: `apps/web/src/App.test.tsx`
- Modify: `docker-compose.yml` (add `web` service)

- [ ] **Step 1: Write `apps/web/package.json`**

```json
{
  "name": "@pokemon/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Write `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "useDefineForClassFields": true,
    "noEmit": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Write `apps/web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "composite": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Write `apps/web/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 5: Write `apps/web/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pokemon Collections</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `apps/web/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Install workspace deps**

Run from repo root: `npm install`
Expected: `@pokemon/web` deps land in the hoisted `node_modules/`.

- [ ] **Step 8: Write the failing component smoke test**

Create `apps/web/src/App.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /pokemon collections/i }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run the test to verify it fails**

Run: `npm test -w @pokemon/web`
Expected: FAIL with "Failed to resolve import './App'".

- [ ] **Step 10: Implement `App.tsx`**

Create `apps/web/src/App.tsx`:

```tsx
export function App() {
  return (
    <main>
      <h1>Pokemon Collections</h1>
      <p>Foundation scaffold — the full UI ships in Plan 3.</p>
    </main>
  );
}
```

- [ ] **Step 11: Implement the React entry point**

Create `apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `npm test -w @pokemon/web`
Expected: PASS — 1 test passed.

- [ ] **Step 13: Verify production build compiles**

Run: `npm run build -w @pokemon/web`
Expected: exits 0; `apps/web/dist/index.html` and a hashed JS bundle exist.

- [ ] **Step 14: Smoke-test the dev server locally**

Run: `npm run dev -w @pokemon/web`
In another terminal: `curl -s http://localhost:5173 | head -n 5`
Expected: HTML beginning with `<!DOCTYPE html>` and containing `<div id="root">`.
Stop the dev server (`Ctrl-C`).

- [ ] **Step 15: Add the `web` service to `docker-compose.yml`**

Edit `docker-compose.yml` so the `services:` block also contains:

```yaml
  web:
    image: node:22-alpine
    working_dir: /workspace
    command: sh -c "npm install && npm run dev -w @pokemon/web"
    environment:
      API_PROXY_TARGET: http://api:3000
    ports:
      - "5173:5173"
    volumes:
      - ./:/workspace
      - /workspace/node_modules
      - /workspace/apps/web/node_modules
    depends_on:
      - api
```

(Leave the `volumes:` block at the bottom unchanged.)

- [ ] **Step 16: Bring up the full dev stack and verify**

Run: `docker compose up -d`
Wait ~60-120s for the initial installs.
Run: `docker compose logs web | tail -n 30`
Expected: `VITE v5.x.x  ready in ...` and a `Local:` URL.
Run: `curl -s http://localhost:5173 | grep -o '<div id="root">'`
Expected: `<div id="root">`.
Run: `curl -s http://localhost:3000/health`
Expected: `{"status":"ok"}`
Run: `docker compose down`

- [ ] **Step 17: Commit**

```bash
git add apps/web docker-compose.yml package-lock.json
git commit -m "chore: scaffold vite react web app"
```

---

## Task 5: Add `@pokemon/shared` types and `ListFileCodec` (TDD)

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/pokemon.ts`, `packages/shared/src/types/list-file.ts`
- Create: `packages/shared/src/codecs/list-file.codec.ts`
- Test: `packages/shared/src/codecs/list-file.codec.test.ts`

- [ ] **Step 1: Write `packages/shared/package.json`**

```json
{
  "name": "@pokemon/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Write `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "commonjs",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "node_modules", "dist"]
}
```

- [ ] **Step 3: Write `packages/shared/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 4: Write `packages/shared/src/types/pokemon.ts`**

```ts
export interface PokemonSnapshot {
  pokemonId: number;
  name: string;
  weight: number;
  sprite: string;
}
```

- [ ] **Step 5: Write `packages/shared/src/types/list-file.ts`**

```ts
export const FILE_ERROR_CODES = {
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  UNSUPPORTED_FILE_VERSION: 'UNSUPPORTED_FILE_VERSION',
} as const;

export type FileErrorCode =
  (typeof FILE_ERROR_CODES)[keyof typeof FILE_ERROR_CODES];

export interface FormatError {
  code: FileErrorCode;
  message: string;
}

export interface ListFileItemV1 {
  pokemonId: number;
  name: string;
  weight: number;
}

export interface ListFileV1 {
  schemaVersion: 1;
  name: string;
  items: ListFileItemV1[];
}
```

- [ ] **Step 6: Write the codec barrel**

Create `packages/shared/src/index.ts`:

```ts
export * from './types/pokemon';
export * from './types/list-file';
export * from './codecs/list-file.codec';
```

- [ ] **Step 7: Install workspace deps**

Run from repo root: `npm install`

- [ ] **Step 8: Write the failing codec tests**

Create `packages/shared/src/codecs/list-file.codec.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ListFileCodec } from './list-file.codec';

describe('ListFileCodec', () => {
  describe('encode', () => {
    it('produces a v1 file with name and items', () => {
      const json = ListFileCodec.encode({
        name: 'My team',
        items: [{ pokemonId: 25, name: 'pikachu', weight: 60 }],
      });
      expect(JSON.parse(json)).toEqual({
        schemaVersion: 1,
        name: 'My team',
        items: [{ pokemonId: 25, name: 'pikachu', weight: 60 }],
      });
    });

    it('strips fields outside the v1 item shape', () => {
      const json = ListFileCodec.encode({
        name: 'My team',
        items: [
          {
            pokemonId: 25,
            name: 'pikachu',
            weight: 60,
            sprite: 'ignored.png',
          } as unknown as { pokemonId: number; name: string; weight: number },
        ],
      });
      expect(JSON.parse(json).items[0]).toEqual({
        pokemonId: 25,
        name: 'pikachu',
        weight: 60,
      });
    });
  });

  describe('decode', () => {
    it('round-trips a v1 file', () => {
      const json = ListFileCodec.encode({
        name: 'My team',
        items: [
          { pokemonId: 25, name: 'pikachu', weight: 60 },
          { pokemonId: 1, name: 'bulbasaur', weight: 69 },
          { pokemonId: 4, name: 'charmander', weight: 85 },
        ],
      });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.schemaVersion).toBe(1);
        expect(result.value.name).toBe('My team');
        expect(result.value.items).toHaveLength(3);
      }
    });

    it('rejects malformed JSON with INVALID_FILE_FORMAT', () => {
      const result = ListFileCodec.decode('not json');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_FILE_FORMAT');
    });

    it('rejects unknown schemaVersion with UNSUPPORTED_FILE_VERSION', () => {
      const json = JSON.stringify({ schemaVersion: 99, name: 'x', items: [] });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.error.code).toBe('UNSUPPORTED_FILE_VERSION');
    });

    it('rejects missing schemaVersion with INVALID_FILE_FORMAT', () => {
      const json = JSON.stringify({ name: 'x', items: [] });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_FILE_FORMAT');
    });

    it('rejects missing required body fields with INVALID_FILE_FORMAT', () => {
      const json = JSON.stringify({ schemaVersion: 1, items: [] });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_FILE_FORMAT');
    });

    it('rejects items with wrong field types with INVALID_FILE_FORMAT', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        name: 'x',
        items: [{ pokemonId: 'abc', name: 'pikachu', weight: 60 }],
      });
      const result = ListFileCodec.decode(json);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_FILE_FORMAT');
    });
  });
});
```

- [ ] **Step 9: Run the test to verify it fails**

Run: `npm test -w @pokemon/shared`
Expected: FAIL with "Failed to resolve import './list-file.codec'".

- [ ] **Step 10: Implement `ListFileCodec`**

Create `packages/shared/src/codecs/list-file.codec.ts`:

```ts
import { z } from 'zod';
import {
  FILE_ERROR_CODES,
  type FormatError,
  type ListFileItemV1,
  type ListFileV1,
} from '../types/list-file';

const itemSchema = z.object({
  pokemonId: z.number().int().positive(),
  name: z.string().min(1),
  weight: z.number().int().nonnegative(),
});

const v1Schema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  items: z.array(itemSchema),
});

const versionProbe = z.object({
  schemaVersion: z.number(),
});

export type DecodeResult =
  | { ok: true; value: ListFileV1 }
  | { ok: false; error: FormatError };

export const ListFileCodec = {
  encode(input: { name: string; items: ListFileItemV1[] }): string {
    const file: ListFileV1 = {
      schemaVersion: 1,
      name: input.name,
      items: input.items.map(({ pokemonId, name, weight }) => ({
        pokemonId,
        name,
        weight,
      })),
    };
    return JSON.stringify(file, null, 2);
  },

  decode(text: string): DecodeResult {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: {
          code: FILE_ERROR_CODES.INVALID_FILE_FORMAT,
          message: 'File is not valid JSON.',
        },
      };
    }

    const probe = versionProbe.safeParse(raw);
    if (!probe.success) {
      return {
        ok: false,
        error: {
          code: FILE_ERROR_CODES.INVALID_FILE_FORMAT,
          message: 'File is missing or has an invalid schemaVersion.',
        },
      };
    }

    if (probe.data.schemaVersion !== 1) {
      return {
        ok: false,
        error: {
          code: FILE_ERROR_CODES.UNSUPPORTED_FILE_VERSION,
          message: `Unsupported schema version: ${probe.data.schemaVersion}.`,
        },
      };
    }

    const parsed = v1Schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: FILE_ERROR_CODES.INVALID_FILE_FORMAT,
          message: 'File contents do not match the v1 schema.',
        },
      };
    }
    return { ok: true, value: parsed.data };
  },
};
```

- [ ] **Step 11: Run the tests to verify they pass**

Run: `npm test -w @pokemon/shared`
Expected: PASS — 8 tests passed.

- [ ] **Step 12: Verify the package builds**

Run: `npm run build -w @pokemon/shared`
Expected: `packages/shared/dist/index.js` and `dist/index.d.ts` exist.

- [ ] **Step 13: Commit**

```bash
git add packages/shared package-lock.json
git commit -m "feat(shared): add types and list file codec v1"
```

---

## Task 6: Add `ListValidator` (TDD)

**Files:**
- Create: `packages/shared/src/validation/list-rules.ts`
- Test: `packages/shared/src/validation/list-rules.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing validator tests**

Create `packages/shared/src/validation/list-rules.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ListValidator } from './list-rules';

const item = (pokemonId: number, weight: number) => ({ pokemonId, weight });

describe('ListValidator', () => {
  it('rejects an empty list with MIN_SPECIES', () => {
    const result = ListValidator.validate([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.code)).toContain('MIN_SPECIES');
    }
  });

  it('rejects a list with two unique species', () => {
    const result = ListValidator.validate([item(1, 100), item(2, 100)]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe('MIN_SPECIES');
  });

  it('rejects three duplicates of the same species with MIN_SPECIES', () => {
    const result = ListValidator.validate([
      item(1, 100),
      item(1, 100),
      item(1, 100),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe('MIN_SPECIES');
  });

  it('accepts a list at exactly the weight limit (1300)', () => {
    const result = ListValidator.validate([
      item(1, 400),
      item(2, 400),
      item(3, 500),
    ]);
    expect(result).toEqual({ ok: true });
  });

  it('rejects a list that exceeds the weight limit by 1', () => {
    const result = ListValidator.validate([
      item(1, 400),
      item(2, 400),
      item(3, 501),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe('WEIGHT_EXCEEDED');
  });

  it('returns both errors when both rules fail simultaneously', () => {
    const result = ListValidator.validate([item(1, 2000)]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((e) => e.code).sort();
      expect(codes).toEqual(['MIN_SPECIES', 'WEIGHT_EXCEEDED']);
    }
  });

  it('accepts a minimal valid list (3 unique species under weight)', () => {
    const result = ListValidator.validate([
      item(1, 100),
      item(2, 100),
      item(3, 100),
    ]);
    expect(result).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -w @pokemon/shared`
Expected: FAIL with "Failed to resolve import './list-rules'".

- [ ] **Step 3: Implement `ListValidator`**

Create `packages/shared/src/validation/list-rules.ts`:

```ts
export const MAX_TOTAL_WEIGHT = 1300;
export const MIN_UNIQUE_SPECIES = 3;

export const VALIDATION_ERROR_CODES = {
  MIN_SPECIES: 'MIN_SPECIES',
  WEIGHT_EXCEEDED: 'WEIGHT_EXCEEDED',
} as const;

export type ValidationErrorCode =
  (typeof VALIDATION_ERROR_CODES)[keyof typeof VALIDATION_ERROR_CODES];

export interface ListValidationError {
  code: ValidationErrorCode;
  message: string;
}

export type ListValidationResult =
  | { ok: true }
  | { ok: false; errors: ListValidationError[] };

export interface ValidatableItem {
  pokemonId: number;
  weight: number;
}

export const ListValidator = {
  validate(items: ValidatableItem[]): ListValidationResult {
    const errors: ListValidationError[] = [];

    const uniqueSpecies = new Set(items.map((i) => i.pokemonId));
    if (uniqueSpecies.size < MIN_UNIQUE_SPECIES) {
      errors.push({
        code: VALIDATION_ERROR_CODES.MIN_SPECIES,
        message: `List must contain at least ${MIN_UNIQUE_SPECIES} different species.`,
      });
    }

    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    if (totalWeight > MAX_TOTAL_WEIGHT) {
      errors.push({
        code: VALIDATION_ERROR_CODES.WEIGHT_EXCEEDED,
        message: `Total weight ${totalWeight} exceeds the maximum of ${MAX_TOTAL_WEIGHT} hectograms.`,
      });
    }

    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  },
};
```

- [ ] **Step 4: Re-export from the barrel**

Edit `packages/shared/src/index.ts` to add:

```ts
export * from './validation/list-rules';
```

Final file contents:

```ts
export * from './types/pokemon';
export * from './types/list-file';
export * from './codecs/list-file.codec';
export * from './validation/list-rules';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -w @pokemon/shared`
Expected: PASS — 15 tests passed (7 validator + 8 codec).

- [ ] **Step 6: Verify the package builds**

Run: `npm run build -w @pokemon/shared`
Expected: exits 0; `dist/validation/list-rules.js` and `.d.ts` are emitted.

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add list validator rules"
```

---

## Task 7: Add README and verify the full stack end-to-end

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
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

The full feature set (Pokemon catalog, list CRUD, file import/export) is delivered in subsequent plans. This commit marks the foundation: working dev stack, shared validation library with full unit-test coverage, and per-workspace toolchain wiring.
```

- [ ] **Step 2: Verify root commands cascade across workspaces**

Run: `npm test`
Expected: each workspace's test script runs and all pass.

Run: `npm run build`
Expected: `@pokemon/shared` emits to `packages/shared/dist`, `@pokemon/api` emits to `apps/api/dist`, `@pokemon/web` emits to `apps/web/dist`.

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 3: Verify the full Docker stack matches the exit criteria**

Run: `docker compose up -d`
Wait until both `api` and `web` containers print their startup banners (use `docker compose logs -f` if needed).

Run: `curl -s http://localhost:3000/health`
Expected: `{"status":"ok"}`

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173`
Expected: `200`

Run: `docker compose exec mongo mongosh --quiet --eval "db.adminCommand('ping')"`
Expected: a JSON document containing `"ok": 1`.

Run: `docker compose down`

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add quick start readme for the foundation scaffold"
```

- [ ] **Step 5: Push the foundation to the remote**

Run: `git push origin main`
Expected: all foundation commits land on `origin/main`.

---

## Exit Criteria

- `docker compose up` brings up Mongo (healthy), API (`/health` returns `{ "status": "ok" }` on `:3000`), and Web (Vite dev server reachable on `:5173`).
- `npm test` from the repo root passes for all three workspaces.
- `npm run build` from the repo root succeeds for all three workspaces.
- `npm run lint` from the repo root exits 0.
- The shared package's `ListValidator` and `ListFileCodec` are fully tested (15 unit tests covering all spec scenarios, including both rules failing simultaneously).
- The repository is pushed to `origin/main` with one commit per task (7 commits total in this plan).

## Out of scope for this plan

- Importing `@pokemon/shared` from `apps/api` or `apps/web` — happens in Plans 2 and 3 alongside the modules that use it.
- Mongoose schemas, the PokemonCache, the PokeApi client, all REST endpoints beyond `/health` — Plan 2.
- Real UI (HomePage, NewListPage, ListDetailPage, components, hooks) — Plan 3.
- Production multi-stage Dockerfiles, nginx reverse proxy, and the full architecture/API README — Plan 4.
