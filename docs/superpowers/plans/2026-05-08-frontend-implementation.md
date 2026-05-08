# Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the React SPA in `apps/web` that lets users browse the Pokémon catalog, build/save/upload/download/delete custom lists against the existing NestJS API, with full TDD coverage of hooks, components, and page-level integration via MSW.

**Architecture:** SPA on Vite + React 18, TanStack Query for all server state, React Router for `/`, `/lists/new`, `/lists/:id`. Tailwind for styling. A pure `useListBuilder` reducer drives the New-List selection. All HTTP goes through a thin `apiClient` that converts the backend's `{ statusCode, errors }` envelope into a typed `ApiError`. Tests use Vitest + React Testing Library + MSW; no real network. Source of truth for types and rules is `@pokemon/shared`.

**Tech Stack:** React 18, TypeScript (strict), Vite, Tailwind 3, React Router 6, TanStack Query 5, Vitest 2, @testing-library/react, @testing-library/user-event, MSW 2.

**Pre-existing context (do not re-do):**
- Vite scaffold at `apps/web/` with `src/App.tsx`, `src/main.tsx`, `src/App.test.tsx`, `vitest` configured (`jsdom`, globals, `src/test/setup.ts` imports `@testing-library/jest-dom`), `vite.config.ts` proxies `/api` → `http://localhost:3000`.
- Backend lives at `apps/api`, mounted under `/api`. Endpoints, error envelope, codes are documented in the spec and the root `README.md`. Web must never call PokéAPI directly.
- `@pokemon/shared` exports `ListValidator`, `ListFileCodec`, `PokemonSnapshot`, `ListFileV1`, `FILE_ERROR_CODES`, `VALIDATION_ERROR_CODES`. Web imports them as runtime values from the built `dist/` (already produced by the foundation plan).
- Repo conventions: every plan ends with green tests and atomic commits; commit messages must NOT include any "Co-Authored-By: Claude" trailer; all UI / commit / comment text is in English.

---

## File Structure

The frontend is split by responsibility, not technical layer. Each file does one thing.

**Modify**

- `apps/web/package.json` — add deps and a `lint` script.
- `apps/web/index.html` — add font preload + root container styling hook.
- `apps/web/vite.config.ts` — extend `test` config with `globals`, `css: true`, MSW polyfill location.
- `apps/web/src/main.tsx` — mount `QueryClientProvider` and `RouterProvider` around the app.
- `apps/web/src/App.tsx` — becomes a `<Outlet/>`-based root layout (header + container).
- `apps/web/src/App.test.tsx` — **delete** (replaced by route-level tests).
- `apps/web/src/test/setup.ts` — start/stop MSW lifecycle.
- `README.md` — add a small "Web app" section pointing to the frontend routes and dev commands.

**Create — config**

- `apps/web/postcss.config.js` — Tailwind + autoprefixer.
- `apps/web/tailwind.config.ts` — content globs.
- `apps/web/src/index.css` — Tailwind directives + global resets.

**Create — API layer**

- `apps/web/src/lib/api-error.ts` — `ApiError` class + parser of the `{ statusCode, errors }` envelope.
- `apps/web/src/lib/format.ts` — `formatWeight(hg) → "12.3 kg"` and `pluralize`.
- `apps/web/src/api/client.ts` — `apiFetch<T>(input, init)` wrapper that throws `ApiError`.
- `apps/web/src/api/pokemon.ts` — `listPokemon`, `getPokemon` typed wrappers.
- `apps/web/src/api/lists.ts` — `listLists`, `getList`, `createList`, `deleteList`, `uploadList`, `downloadListUrl`.
- `apps/web/src/api/types.ts` — DTOs that mirror backend payloads (`CatalogItem`, `CatalogPage`, `ListSummary`, `ListDetail`).

**Create — hooks**

- `apps/web/src/hooks/useDebouncedValue.ts`
- `apps/web/src/hooks/usePokemonCatalog.ts`
- `apps/web/src/hooks/useLists.ts`
- `apps/web/src/hooks/useList.ts`
- `apps/web/src/hooks/useCreateList.ts`
- `apps/web/src/hooks/useUploadList.ts`
- `apps/web/src/hooks/useDeleteList.ts`
- `apps/web/src/hooks/useListBuilder.ts`

**Create — components**

- `apps/web/src/components/AppLayout.tsx` — header + nav + `<Outlet/>`.
- `apps/web/src/components/WeightMeter.tsx` — progress bar with weight + species count.
- `apps/web/src/components/PokemonCard.tsx`
- `apps/web/src/components/ListCard.tsx`
- `apps/web/src/components/FileUploader.tsx`
- `apps/web/src/components/ErrorBanner.tsx`
- `apps/web/src/components/ConfirmDialog.tsx`
- `apps/web/src/components/SelectedPanel.tsx`
- `apps/web/src/components/SkeletonGrid.tsx`
- `apps/web/src/components/Pagination.tsx`

**Create — pages & routing**

- `apps/web/src/router.tsx` — `createBrowserRouter` config.
- `apps/web/src/pages/HomePage.tsx`
- `apps/web/src/pages/NewListPage.tsx`
- `apps/web/src/pages/ListDetailPage.tsx`
- `apps/web/src/pages/NotFoundPage.tsx`

**Create — test infra**

- `apps/web/src/test/server.ts` — MSW Node server.
- `apps/web/src/test/handlers.ts` — default handlers (catalog/lists fixtures).
- `apps/web/src/test/fixtures.ts` — shared sample data.
- `apps/web/src/test/render.tsx` — `renderWithProviders(ui, { route, queryClient })`.

---

## Task 1: Add frontend dependencies and Tailwind config

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/src/index.css`
- Modify: `apps/web/index.html`
- Modify: `apps/web/src/main.tsx` (import `./index.css`)

- [ ] **Step 1: Update `apps/web/package.json`**

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
    "test": "vitest run",
    "lint": "eslint src"
  },
  "dependencies": {
    "@pokemon/shared": "*",
    "@tanstack/react-query": "^5.59.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "msw": "^2.4.9",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Install**

Run: `npm install` (from repo root).
Expected: `added N packages` with no error. `node_modules/@tanstack/react-query` and `node_modules/tailwindcss` exist.

- [ ] **Step 3: Add Tailwind config files**

`apps/web/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

`apps/web/postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`apps/web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

body {
  @apply bg-slate-50 text-slate-900 min-h-screen;
}

button {
  @apply transition-colors;
}
```

- [ ] **Step 4: Wire CSS into `main.tsx` and clean up `index.html`**

`apps/web/src/main.tsx` (full file — provider wiring lands in a later task):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`apps/web/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pokemon Collections</title>
  </head>
  <body class="antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Verify the build still passes**

Run: `npm run build -w @pokemon/web`
Expected: `vite v5.x.x building for production...` followed by `✓ built in ...` with no Tailwind warnings. `apps/web/dist/index.html` exists.

- [ ] **Step 6: Verify the existing test still passes**

Run: `npm test -w @pokemon/web`
Expected: `App > renders the heading` PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/postcss.config.js apps/web/tailwind.config.ts apps/web/src/index.css apps/web/src/main.tsx apps/web/index.html package-lock.json
git commit -m "chore(web): add tanstack-query, router, tailwind, msw deps"
```

---

## Task 2: Set up MSW and test render helper

**Files:**
- Create: `apps/web/src/test/server.ts`
- Create: `apps/web/src/test/handlers.ts`
- Create: `apps/web/src/test/fixtures.ts`
- Create: `apps/web/src/test/render.tsx`
- Modify: `apps/web/src/test/setup.ts`
- Modify: `apps/web/vite.config.ts`

These files contain test infrastructure used by every later task. They are written without TDD because they ARE the testing harness; their correctness is validated by the tests that depend on them landing green in subsequent tasks. We do, however, sanity-test the harness itself in Step 6.

- [ ] **Step 1: Create fixtures**

`apps/web/src/test/fixtures.ts`:

```ts
import type { CatalogItem, CatalogPage, ListDetail, ListSummary } from '../api/types';

export const bulbasaur: CatalogItem = {
  id: 1,
  name: 'bulbasaur',
  weight: 69,
  sprite: 'https://example.test/sprites/1.png',
  types: ['grass', 'poison'],
};

export const charmander: CatalogItem = {
  id: 4,
  name: 'charmander',
  weight: 85,
  sprite: 'https://example.test/sprites/4.png',
  types: ['fire'],
};

export const squirtle: CatalogItem = {
  id: 7,
  name: 'squirtle',
  weight: 90,
  sprite: 'https://example.test/sprites/7.png',
  types: ['water'],
};

export const pikachu: CatalogItem = {
  id: 25,
  name: 'pikachu',
  weight: 60,
  sprite: 'https://example.test/sprites/25.png',
  types: ['electric'],
};

export const samplePage: CatalogPage = {
  items: [bulbasaur, charmander, squirtle, pikachu],
  total: 4,
  page: 1,
  limit: 20,
};

export const sampleListSummary: ListSummary = {
  id: '64a000000000000000000001',
  name: 'Starters',
  itemCount: 3,
  totalWeight: 244,
  createdAt: '2026-05-01T12:00:00.000Z',
};

export const sampleListDetail: ListDetail = {
  _id: '64a000000000000000000001',
  name: 'Starters',
  items: [
    { pokemonId: 1, name: 'bulbasaur', weight: 69, sprite: bulbasaur.sprite },
    { pokemonId: 4, name: 'charmander', weight: 85, sprite: charmander.sprite },
    { pokemonId: 7, name: 'squirtle', weight: 90, sprite: squirtle.sprite },
  ],
  createdAt: '2026-05-01T12:00:00.000Z',
};
```

- [ ] **Step 2: Create default MSW handlers**

`apps/web/src/test/handlers.ts`:

```ts
import { http, HttpResponse } from 'msw';
import {
  bulbasaur,
  charmander,
  pikachu,
  sampleListDetail,
  sampleListSummary,
  samplePage,
  squirtle,
} from './fixtures';

export const defaultHandlers = [
  http.get('/api/pokemon', ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const all = [bulbasaur, charmander, squirtle, pikachu];
    const filtered = search
      ? all.filter((p) => p.name.includes(search))
      : all;
    return HttpResponse.json({
      items: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
    });
  }),

  http.get('/api/pokemon/:idOrName', ({ params }) => {
    const idOrName = String(params.idOrName);
    const all = [bulbasaur, charmander, squirtle, pikachu];
    const found =
      all.find((p) => String(p.id) === idOrName) ??
      all.find((p) => p.name === idOrName);
    if (!found) {
      return HttpResponse.json(
        { statusCode: 404, errors: [{ code: 'NOT_FOUND', message: 'Not found.' }] },
        { status: 404 },
      );
    }
    return HttpResponse.json(found);
  }),

  http.get('/api/lists', () => HttpResponse.json([sampleListSummary])),

  http.get('/api/lists/:id', () => HttpResponse.json(sampleListDetail)),

  http.post('/api/lists', async ({ request }) => {
    const body = (await request.json()) as { name: string; pokemonIds: number[] };
    return HttpResponse.json(
      {
        _id: 'new-list-id',
        name: body.name,
        items: samplePage.items
          .filter((p) => body.pokemonIds.includes(p.id))
          .map((p) => ({
            pokemonId: p.id,
            name: p.name,
            weight: p.weight,
            sprite: p.sprite,
          })),
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  http.delete('/api/lists/:id', () => new HttpResponse(null, { status: 204 })),

  http.post('/api/lists/upload', () =>
    HttpResponse.json(sampleListDetail, { status: 201 }),
  ),
];
```

- [ ] **Step 3: Create the MSW server module**

`apps/web/src/test/server.ts`:

```ts
import { setupServer } from 'msw/node';
import { defaultHandlers } from './handlers';

export const server = setupServer(...defaultHandlers);
```

- [ ] **Step 4: Wire MSW lifecycle into vitest setup**

Replace `apps/web/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 5: Create the render helper**

`apps/web/src/test/render.tsx`:

```tsx
import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router-dom';

interface ProviderOptions {
  routes?: RouteObject[];
  initialEntries?: string[];
  queryClient?: QueryClient;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const {
    routes,
    initialEntries = ['/'],
    queryClient = makeQueryClient(),
    ...rest
  } = options;

  const wrapper = ({ children }: { children: ReactNode }) => {
    if (routes) {
      const router = createMemoryRouter(routes, { initialEntries });
      return (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );
    }
    const router = createMemoryRouter(
      [{ path: '*', element: <>{children}</> }],
      { initialEntries },
    );
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper, ...rest });
}
```

- [ ] **Step 6: Update `vite.config.ts` so vitest CSS is on (Tailwind classnames don't break tests) and HMR doesn't spam during runs**

`apps/web/vite.config.ts`:

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
    css: false,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 7: Sanity-test the harness**

Replace `apps/web/src/App.test.tsx` content with a one-shot harness sanity test (we delete this file in Task 22 once the real route tests exist):

```tsx
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from './test/render';

describe('test harness', () => {
  it('renders content with providers', () => {
    const { getByText } = renderWithProviders(<span>hello</span>);
    expect(getByText('hello')).toBeInTheDocument();
  });
});
```

Run: `npm test -w @pokemon/web`
Expected: `1 passed`. No "unhandled request" errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/test apps/web/vite.config.ts apps/web/src/App.test.tsx
git commit -m "test(web): set up msw + provider-aware render helper"
```

---

## Task 3: Add `api/types.ts` and `lib/api-error.ts` (TDD)

**Files:**
- Create: `apps/web/src/api/types.ts`
- Create: `apps/web/src/lib/api-error.ts`
- Test: `apps/web/src/lib/api-error.test.ts`

- [ ] **Step 1: Define `api/types.ts`**

```ts
import type { PokemonSnapshot } from '@pokemon/shared';

export interface CatalogItem {
  id: number;
  name: string;
  weight: number;
  sprite: string;
  types: string[];
}

export interface CatalogPage {
  items: CatalogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListSummary {
  id: string;
  name: string;
  itemCount: number;
  totalWeight: number;
  createdAt: string;
}

export interface ListDetail {
  _id: string;
  name: string;
  items: PokemonSnapshot[];
  createdAt: string;
}

export interface ApiErrorEntry {
  code: string;
  message: string;
}

export interface ApiErrorEnvelope {
  statusCode: number;
  errors: ApiErrorEntry[];
}
```

- [ ] **Step 2: Write the failing test**

`apps/web/src/lib/api-error.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ApiError, parseApiError } from './api-error';

describe('ApiError', () => {
  it('is throwable and exposes status + errors', () => {
    const err = new ApiError(400, [
      { code: 'MIN_SPECIES', message: 'too few species' },
    ]);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.errors).toHaveLength(1);
    expect(err.firstCode).toBe('MIN_SPECIES');
    expect(err.message).toMatch(/too few species/);
  });

  it('parseApiError extracts a typed error from a fetch response payload', async () => {
    const envelope = {
      statusCode: 400,
      errors: [
        { code: 'MIN_SPECIES', message: 'a' },
        { code: 'WEIGHT_EXCEEDED', message: 'b' },
      ],
    };
    const err = parseApiError(400, envelope);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.errors.map((e) => e.code)).toEqual([
      'MIN_SPECIES',
      'WEIGHT_EXCEEDED',
    ]);
  });

  it('parseApiError falls back when payload is not the expected shape', () => {
    const err = parseApiError(500, 'kaboom');
    expect(err.status).toBe(500);
    expect(err.firstCode).toBe('INTERNAL_ERROR');
    expect(err.message).toMatch(/kaboom|unexpected/i);
  });

  it('parseApiError handles a missing payload', () => {
    const err = parseApiError(502, undefined);
    expect(err.status).toBe(502);
    expect(err.firstCode).toBe('INTERNAL_ERROR');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -w @pokemon/web -- api-error`
Expected: FAIL — "Cannot find module './api-error'".

- [ ] **Step 4: Implement `lib/api-error.ts`**

```ts
import type { ApiErrorEntry, ApiErrorEnvelope } from '../api/types';

export class ApiError extends Error {
  readonly status: number;
  readonly errors: ApiErrorEntry[];

  constructor(status: number, errors: ApiErrorEntry[]) {
    const head = errors[0];
    super(head ? head.message : `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  get firstCode(): string {
    return this.errors[0]?.code ?? 'INTERNAL_ERROR';
  }
}

function isEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.errors);
}

export function parseApiError(status: number, payload: unknown): ApiError {
  if (isEnvelope(payload)) {
    return new ApiError(status, payload.errors);
  }
  const message =
    typeof payload === 'string' && payload
      ? payload
      : status >= 500
        ? 'Unexpected server error.'
        : 'Request failed.';
  return new ApiError(status, [{ code: 'INTERNAL_ERROR', message }]);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -w @pokemon/web -- api-error`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/api/types.ts apps/web/src/lib/api-error.ts apps/web/src/lib/api-error.test.ts
git commit -m "feat(web): add ApiError envelope parser"
```

---

## Task 4: `api/client.ts` `apiFetch` wrapper (TDD)

**Files:**
- Create: `apps/web/src/api/client.ts`
- Test: `apps/web/src/api/client.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/src/api/client.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { apiFetch } from './client';
import { ApiError } from '../lib/api-error';

describe('apiFetch', () => {
  it('returns parsed JSON on 2xx', async () => {
    server.use(
      http.get('/api/echo', () => HttpResponse.json({ hello: 'world' })),
    );
    const result = await apiFetch<{ hello: string }>('/api/echo');
    expect(result).toEqual({ hello: 'world' });
  });

  it('returns null on 204', async () => {
    server.use(
      http.delete('/api/thing/:id', () => new HttpResponse(null, { status: 204 })),
    );
    const result = await apiFetch<null>('/api/thing/42', { method: 'DELETE' });
    expect(result).toBeNull();
  });

  it('throws ApiError on non-2xx with envelope', async () => {
    server.use(
      http.post('/api/lists', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            errors: [{ code: 'MIN_SPECIES', message: 'need 3' }],
          },
          { status: 400 },
        ),
      ),
    );
    await expect(
      apiFetch('/api/lists', { method: 'POST', body: JSON.stringify({}) }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('serialises a JSON body and sets Content-Type when given a plain object', async () => {
    let received: unknown;
    server.use(
      http.post('/api/echo', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/api/echo', {
      method: 'POST',
      json: { name: 'x', pokemonIds: [1, 2, 3] },
    });
    expect(received).toEqual({ name: 'x', pokemonIds: [1, 2, 3] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -w @pokemon/web -- api/client`
Expected: FAIL — "Cannot find module './client'".

- [ ] **Step 3: Implement `api/client.ts`**

```ts
import { parseApiError } from '../lib/api-error';

export interface ApiFetchInit extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null;
  json?: unknown;
}

export async function apiFetch<T>(
  input: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  let body = init.body;
  if (init.json !== undefined) {
    body = JSON.stringify(init.json);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(input, { ...init, body, headers });

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  const payload = text ? safeJson(text) : undefined;

  if (!response.ok) {
    throw parseApiError(response.status, payload ?? text);
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -w @pokemon/web -- api/client`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/client.ts apps/web/src/api/client.test.ts
git commit -m "feat(web): add apiFetch wrapper with envelope error handling"
```

---

## Task 5: `api/pokemon.ts` and `api/lists.ts` (TDD)

**Files:**
- Create: `apps/web/src/api/pokemon.ts`
- Create: `apps/web/src/api/lists.ts`
- Test: `apps/web/src/api/pokemon.test.ts`
- Test: `apps/web/src/api/lists.test.ts`

- [ ] **Step 1: Write `pokemon.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { listPokemon, getPokemon } from './pokemon';
import { bulbasaur } from '../test/fixtures';

describe('pokemon api', () => {
  it('fetches catalog with query params', async () => {
    const page = await listPokemon({ page: 1, limit: 20, search: 'bulb' });
    expect(page.items[0]?.name).toBe('bulbasaur');
    expect(page.total).toBeGreaterThanOrEqual(1);
  });

  it('fetches a single pokemon by id', async () => {
    const p = await getPokemon(1);
    expect(p).toEqual(bulbasaur);
  });
});
```

- [ ] **Step 2: Run — should fail with module-missing**

Run: `npm test -w @pokemon/web -- api/pokemon`
Expected: FAIL ("Cannot find module './pokemon'").

- [ ] **Step 3: Implement `api/pokemon.ts`**

```ts
import { apiFetch } from './client';
import type { CatalogItem, CatalogPage } from './types';

export interface ListPokemonInput {
  page?: number;
  limit?: number;
  search?: string;
}

export function listPokemon(input: ListPokemonInput = {}): Promise<CatalogPage> {
  const params = new URLSearchParams();
  if (input.page !== undefined) params.set('page', String(input.page));
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.search) params.set('search', input.search);
  const qs = params.toString();
  return apiFetch<CatalogPage>(`/api/pokemon${qs ? `?${qs}` : ''}`);
}

export function getPokemon(idOrName: number | string): Promise<CatalogItem> {
  return apiFetch<CatalogItem>(`/api/pokemon/${idOrName}`);
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- api/pokemon`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `lists.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import {
  listLists,
  getList,
  createList,
  deleteList,
  uploadList,
  downloadListUrl,
} from './lists';
import { sampleListDetail, sampleListSummary } from '../test/fixtures';

describe('lists api', () => {
  it('listLists returns summaries', async () => {
    const res = await listLists();
    expect(res).toEqual([sampleListSummary]);
  });

  it('getList returns a detail document', async () => {
    const res = await getList('64a000000000000000000001');
    expect(res).toEqual(sampleListDetail);
  });

  it('createList POSTs JSON and returns the created list', async () => {
    let received: unknown;
    server.use(
      http.post('/api/lists', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(sampleListDetail, { status: 201 });
      }),
    );
    const res = await createList({ name: 'x', pokemonIds: [1, 4, 7] });
    expect(received).toEqual({ name: 'x', pokemonIds: [1, 4, 7] });
    expect(res).toEqual(sampleListDetail);
  });

  it('deleteList resolves on 204', async () => {
    await expect(deleteList('abc')).resolves.toBeNull();
  });

  it('uploadList sends multipart and returns the created list', async () => {
    let contentType = '';
    server.use(
      http.post('/api/lists/upload', ({ request }) => {
        contentType = request.headers.get('content-type') ?? '';
        return HttpResponse.json(sampleListDetail, { status: 201 });
      }),
    );
    const file = new File(['{}'], 'team.json', { type: 'application/json' });
    const res = await uploadList(file);
    expect(contentType).toMatch(/multipart\/form-data/);
    expect(res).toEqual(sampleListDetail);
  });

  it('downloadListUrl yields the canonical download URL', () => {
    expect(downloadListUrl('xyz')).toBe('/api/lists/xyz/download');
  });
});
```

- [ ] **Step 6: Run — should fail with module-missing**

Run: `npm test -w @pokemon/web -- api/lists`
Expected: FAIL ("Cannot find module './lists'").

- [ ] **Step 7: Implement `api/lists.ts`**

```ts
import { apiFetch } from './client';
import type { ListDetail, ListSummary } from './types';

export interface CreateListInput {
  name: string;
  pokemonIds: number[];
}

export function listLists(): Promise<ListSummary[]> {
  return apiFetch<ListSummary[]>('/api/lists');
}

export function getList(id: string): Promise<ListDetail> {
  return apiFetch<ListDetail>(`/api/lists/${id}`);
}

export function createList(input: CreateListInput): Promise<ListDetail> {
  return apiFetch<ListDetail>('/api/lists', {
    method: 'POST',
    json: input,
  });
}

export function deleteList(id: string): Promise<null> {
  return apiFetch<null>(`/api/lists/${id}`, { method: 'DELETE' });
}

export function uploadList(file: File): Promise<ListDetail> {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<ListDetail>('/api/lists/upload', {
    method: 'POST',
    body: form,
  });
}

export function downloadListUrl(id: string): string {
  return `/api/lists/${id}/download`;
}
```

- [ ] **Step 8: Run — should pass**

Run: `npm test -w @pokemon/web -- api`
Expected: PASS for both `api/pokemon.test.ts` and `api/lists.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/api
git commit -m "feat(web): add typed pokemon and lists API modules"
```

---

## Task 6: `lib/format.ts` weight + species formatters (TDD)

**Files:**
- Create: `apps/web/src/lib/format.ts`
- Test: `apps/web/src/lib/format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { formatWeight, pluralize } from './format';

describe('format', () => {
  it('formatWeight converts hectograms to kg with one decimal', () => {
    expect(formatWeight(0)).toBe('0.0 kg');
    expect(formatWeight(60)).toBe('6.0 kg');
    expect(formatWeight(244)).toBe('24.4 kg');
    expect(formatWeight(1300)).toBe('130.0 kg');
  });

  it('pluralize uses the singular form for 1 and the plural otherwise', () => {
    expect(pluralize(1, 'species', 'species')).toBe('1 species');
    expect(pluralize(0, 'pokemon', 'pokemon')).toBe('0 pokemon');
    expect(pluralize(2, 'item', 'items')).toBe('2 items');
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- format`
Expected: FAIL — "Cannot find module './format'".

- [ ] **Step 3: Implement**

`apps/web/src/lib/format.ts`:

```ts
export function formatWeight(hectograms: number): string {
  return `${(hectograms / 10).toFixed(1)} kg`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- format`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/format.ts apps/web/src/lib/format.test.ts
git commit -m "feat(web): add weight and pluralize formatters"
```

---

## Task 7: `useDebouncedValue` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/useDebouncedValue.ts`
- Test: `apps/web/src/hooks/useDebouncedValue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
    vi.useRealTimers();
  });

  it('updates only after the delay elapses', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'b' });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- useDebouncedValue`
Expected: FAIL — "Cannot find module './useDebouncedValue'".

- [ ] **Step 3: Implement**

`apps/web/src/hooks/useDebouncedValue.ts`:

```ts
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- useDebouncedValue`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useDebouncedValue.ts apps/web/src/hooks/useDebouncedValue.test.ts
git commit -m "feat(web): add useDebouncedValue hook"
```

---

## Task 8: `useListBuilder` reducer hook (TDD)

The selection-state reducer for `NewListPage`. Pure logic only, no network. Validates selection by re-using `ListValidator` from `@pokemon/shared` for derived `isValid` / `errors`.

**Files:**
- Create: `apps/web/src/hooks/useListBuilder.ts`
- Test: `apps/web/src/hooks/useListBuilder.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useListBuilder } from './useListBuilder';
import { bulbasaur, charmander, squirtle } from '../test/fixtures';

describe('useListBuilder', () => {
  it('starts with an empty selection and an invalid validator state', () => {
    const { result } = renderHook(() => useListBuilder());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalWeight).toBe(0);
    expect(result.current.uniqueSpecies).toBe(0);
    expect(result.current.validation.ok).toBe(false);
  });

  it('toggles items in and out of the selection', () => {
    const { result } = renderHook(() => useListBuilder());
    act(() => result.current.toggle(bulbasaur));
    expect(result.current.items).toHaveLength(1);
    act(() => result.current.toggle(bulbasaur));
    expect(result.current.items).toHaveLength(0);
  });

  it('isSelected reflects the current selection', () => {
    const { result } = renderHook(() => useListBuilder());
    expect(result.current.isSelected(1)).toBe(false);
    act(() => result.current.toggle(bulbasaur));
    expect(result.current.isSelected(1)).toBe(true);
  });

  it('reaches a valid state once 3 unique species under 1300hg are picked', () => {
    const { result } = renderHook(() => useListBuilder());
    act(() => {
      result.current.toggle(bulbasaur);
      result.current.toggle(charmander);
      result.current.toggle(squirtle);
    });
    expect(result.current.uniqueSpecies).toBe(3);
    expect(result.current.totalWeight).toBe(244);
    expect(result.current.validation.ok).toBe(true);
  });

  it('flags WEIGHT_EXCEEDED when total > 1300', () => {
    const heavy = { ...bulbasaur, id: 99, name: 'snorlax', weight: 5000 };
    const { result } = renderHook(() => useListBuilder());
    act(() => {
      result.current.toggle(heavy);
      result.current.toggle({ ...heavy, id: 100, name: 'wailord' });
      result.current.toggle({ ...heavy, id: 101, name: 'mudsdale' });
    });
    expect(result.current.validation.ok).toBe(false);
    if (!result.current.validation.ok) {
      expect(
        result.current.validation.errors.map((e) => e.code),
      ).toContain('WEIGHT_EXCEEDED');
    }
  });

  it('setFromFile replaces the entire selection', () => {
    const { result } = renderHook(() => useListBuilder());
    act(() => result.current.toggle(bulbasaur));
    act(() =>
      result.current.setFromFile({
        name: 'Imported',
        items: [
          { pokemonId: 4, name: 'charmander', weight: 85 },
          { pokemonId: 7, name: 'squirtle', weight: 90 },
        ],
      }),
    );
    expect(result.current.items.map((i) => i.pokemonId)).toEqual([4, 7]);
    expect(result.current.name).toBe('Imported');
  });

  it('clear resets selection and name', () => {
    const { result } = renderHook(() => useListBuilder());
    act(() => {
      result.current.setName('My team');
      result.current.toggle(bulbasaur);
    });
    act(() => result.current.clear());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.name).toBe('');
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- useListBuilder`
Expected: FAIL ("Cannot find module './useListBuilder'").

- [ ] **Step 3: Implement**

`apps/web/src/hooks/useListBuilder.ts`:

```ts
import { useCallback, useMemo, useReducer } from 'react';
import { ListValidator, type ListValidationResult } from '@pokemon/shared';
import type { CatalogItem } from '../api/types';

export interface BuilderItem {
  pokemonId: number;
  name: string;
  weight: number;
  sprite: string;
}

interface State {
  name: string;
  items: BuilderItem[];
}

type Action =
  | { type: 'toggle'; pokemon: CatalogItem }
  | { type: 'setName'; name: string }
  | {
      type: 'setFromFile';
      payload: { name: string; items: { pokemonId: number; name: string; weight: number }[] };
    }
  | { type: 'clear' };

const initialState: State = { name: '', items: [] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'toggle': {
      const exists = state.items.some(
        (i) => i.pokemonId === action.pokemon.id,
      );
      if (exists) {
        return {
          ...state,
          items: state.items.filter((i) => i.pokemonId !== action.pokemon.id),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            pokemonId: action.pokemon.id,
            name: action.pokemon.name,
            weight: action.pokemon.weight,
            sprite: action.pokemon.sprite,
          },
        ],
      };
    }
    case 'setName':
      return { ...state, name: action.name };
    case 'setFromFile':
      return {
        name: action.payload.name,
        items: action.payload.items.map((i) => ({
          pokemonId: i.pokemonId,
          name: i.name,
          weight: i.weight,
          sprite: '',
        })),
      };
    case 'clear':
      return initialState;
  }
}

export interface UseListBuilder {
  name: string;
  items: BuilderItem[];
  totalWeight: number;
  uniqueSpecies: number;
  validation: ListValidationResult;
  isSelected: (pokemonId: number) => boolean;
  toggle: (pokemon: CatalogItem) => void;
  setName: (name: string) => void;
  setFromFile: (payload: {
    name: string;
    items: { pokemonId: number; name: string; weight: number }[];
  }) => void;
  clear: () => void;
}

export function useListBuilder(): UseListBuilder {
  const [state, dispatch] = useReducer(reducer, initialState);

  const totalWeight = useMemo(
    () => state.items.reduce((sum, i) => sum + i.weight, 0),
    [state.items],
  );
  const uniqueSpecies = useMemo(
    () => new Set(state.items.map((i) => i.pokemonId)).size,
    [state.items],
  );
  const validation = useMemo(
    () => ListValidator.validate(state.items),
    [state.items],
  );

  const toggle = useCallback(
    (pokemon: CatalogItem) => dispatch({ type: 'toggle', pokemon }),
    [],
  );
  const setName = useCallback(
    (name: string) => dispatch({ type: 'setName', name }),
    [],
  );
  const setFromFile = useCallback<UseListBuilder['setFromFile']>(
    (payload) => dispatch({ type: 'setFromFile', payload }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const isSelected = useCallback(
    (pokemonId: number) => state.items.some((i) => i.pokemonId === pokemonId),
    [state.items],
  );

  return {
    name: state.name,
    items: state.items,
    totalWeight,
    uniqueSpecies,
    validation,
    isSelected,
    toggle,
    setName,
    setFromFile,
    clear,
  };
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- useListBuilder`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useListBuilder.ts apps/web/src/hooks/useListBuilder.test.ts
git commit -m "feat(web): add useListBuilder reducer hook"
```

---

## Task 9: TanStack Query catalog and lists hooks (TDD)

**Files:**
- Create: `apps/web/src/hooks/usePokemonCatalog.ts`
- Create: `apps/web/src/hooks/useLists.ts`
- Create: `apps/web/src/hooks/useList.ts`
- Create: `apps/web/src/hooks/useCreateList.ts`
- Create: `apps/web/src/hooks/useUploadList.ts`
- Create: `apps/web/src/hooks/useDeleteList.ts`
- Test: `apps/web/src/hooks/usePokemonCatalog.test.tsx`
- Test: `apps/web/src/hooks/useLists.test.tsx`

These hooks are tiny `useQuery`/`useMutation` wrappers; one focused test per file is enough.

- [ ] **Step 1: Write `usePokemonCatalog.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '../test/render';
import { usePokemonCatalog } from './usePokemonCatalog';

function wrapper() {
  const client = makeQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('usePokemonCatalog', () => {
  it('debounces the search term and returns a page', async () => {
    const { result } = renderHook(
      () => usePokemonCatalog({ page: 1, limit: 20, search: 'bulb' }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0]?.name).toBe('bulbasaur');
  });
});
```

- [ ] **Step 2: Run — should fail (module missing)**

Run: `npm test -w @pokemon/web -- usePokemonCatalog`
Expected: FAIL.

- [ ] **Step 3: Implement `usePokemonCatalog.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { listPokemon, type ListPokemonInput } from '../api/pokemon';
import { useDebouncedValue } from './useDebouncedValue';

export function usePokemonCatalog(input: ListPokemonInput) {
  const debouncedSearch = useDebouncedValue(input.search ?? '', 300);
  return useQuery({
    queryKey: ['pokemon', input.page, input.limit, debouncedSearch],
    queryFn: () =>
      listPokemon({
        page: input.page,
        limit: input.limit,
        search: debouncedSearch || undefined,
      }),
    placeholderData: (prev) => prev,
  });
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- usePokemonCatalog`
Expected: PASS.

- [ ] **Step 5: Implement `useLists.ts`, `useList.ts` (no separate tests; integration tests on pages will exercise them)**

`apps/web/src/hooks/useLists.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { listLists } from '../api/lists';

export const listsQueryKey = ['lists'] as const;

export function useLists() {
  return useQuery({
    queryKey: listsQueryKey,
    queryFn: listLists,
  });
}
```

`apps/web/src/hooks/useList.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { getList } from '../api/lists';

export function useList(id: string | undefined) {
  return useQuery({
    queryKey: ['list', id],
    queryFn: () => getList(id as string),
    enabled: Boolean(id),
  });
}
```

- [ ] **Step 6: Implement mutation hooks**

`apps/web/src/hooks/useCreateList.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createList, type CreateListInput } from '../api/lists';
import { listsQueryKey } from './useLists';

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateListInput) => createList(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listsQueryKey });
    },
  });
}
```

`apps/web/src/hooks/useUploadList.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadList } from '../api/lists';
import { listsQueryKey } from './useLists';

export function useUploadList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadList(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listsQueryKey });
    },
  });
}
```

`apps/web/src/hooks/useDeleteList.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteList } from '../api/lists';
import { listsQueryKey } from './useLists';

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteList(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listsQueryKey });
    },
  });
}
```

- [ ] **Step 7: Write `useLists.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '../test/render';
import { useLists } from './useLists';

function wrapper() {
  const client = makeQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useLists', () => {
  it('returns the seeded lists', async () => {
    const { result } = renderHook(() => useLists(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.name).toBe('Starters');
  });
});
```

- [ ] **Step 8: Run all hooks tests — should pass**

Run: `npm test -w @pokemon/web -- hooks`
Expected: every test green.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/hooks/usePokemonCatalog.ts apps/web/src/hooks/useLists.ts apps/web/src/hooks/useList.ts apps/web/src/hooks/useCreateList.ts apps/web/src/hooks/useUploadList.ts apps/web/src/hooks/useDeleteList.ts apps/web/src/hooks/usePokemonCatalog.test.tsx apps/web/src/hooks/useLists.test.tsx
git commit -m "feat(web): add tanstack-query hooks for catalog and lists"
```

---

## Task 10: `WeightMeter` component (TDD)

**Files:**
- Create: `apps/web/src/components/WeightMeter.tsx`
- Test: `apps/web/src/components/WeightMeter.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeightMeter } from './WeightMeter';

describe('WeightMeter', () => {
  it('renders the formatted weight, max, and species count', () => {
    render(<WeightMeter weight={244} species={3} />);
    expect(screen.getByText('24.4 kg / 130.0 kg')).toBeInTheDocument();
    expect(screen.getByText(/3 species/)).toBeInTheDocument();
  });

  it('marks the meter "exceeded" when weight is above the max', () => {
    render(<WeightMeter weight={1500} species={4} />);
    const meter = screen.getByRole('progressbar');
    expect(meter).toHaveAttribute('aria-valuenow', '1300');
    expect(meter).toHaveAttribute('data-state', 'exceeded');
  });

  it('marks the meter "ok" when within range', () => {
    render(<WeightMeter weight={500} species={3} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-state', 'ok');
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- WeightMeter`
Expected: FAIL.

- [ ] **Step 3: Implement**

`apps/web/src/components/WeightMeter.tsx`:

```tsx
import { MAX_TOTAL_WEIGHT } from '@pokemon/shared';
import { formatWeight, pluralize } from '../lib/format';

export interface WeightMeterProps {
  weight: number;
  species: number;
}

export function WeightMeter({ weight, species }: WeightMeterProps) {
  const exceeded = weight > MAX_TOTAL_WEIGHT;
  const clamped = Math.min(weight, MAX_TOTAL_WEIGHT);
  const pct = Math.round((clamped / MAX_TOTAL_WEIGHT) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm font-medium">
        <span>
          {formatWeight(weight)} / {formatWeight(MAX_TOTAL_WEIGHT)}
        </span>
        <span>{pluralize(species, 'species', 'species')}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={MAX_TOTAL_WEIGHT}
        aria-valuenow={clamped}
        data-state={exceeded ? 'exceeded' : 'ok'}
        className="mt-2 h-2 rounded bg-slate-200 overflow-hidden"
      >
        <div
          className={`h-full ${exceeded ? 'bg-red-500' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- WeightMeter`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/WeightMeter.tsx apps/web/src/components/WeightMeter.test.tsx
git commit -m "feat(web): add WeightMeter component"
```

---

## Task 11: `ErrorBanner` component (TDD)

**Files:**
- Create: `apps/web/src/components/ErrorBanner.tsx`
- Test: `apps/web/src/components/ErrorBanner.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBanner } from './ErrorBanner';
import { ApiError } from '../lib/api-error';

describe('ErrorBanner', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(<ErrorBanner error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders all error messages when given an ApiError', () => {
    const err = new ApiError(400, [
      { code: 'MIN_SPECIES', message: 'need 3 different species' },
      { code: 'WEIGHT_EXCEEDED', message: 'too heavy' },
    ]);
    render(<ErrorBanner error={err} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/need 3 different species/)).toBeInTheDocument();
    expect(screen.getByText(/too heavy/)).toBeInTheDocument();
  });

  it('falls back to a generic message for non-ApiError values', () => {
    render(<ErrorBanner error={new Error('boom')} />);
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });

  it('calls onDismiss when the close button is clicked', async () => {
    const onDismiss = vi.fn();
    const err = new ApiError(400, [{ code: 'X', message: 'msg' }]);
    render(<ErrorBanner error={err} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- ErrorBanner`
Expected: FAIL.

- [ ] **Step 3: Implement**

`apps/web/src/components/ErrorBanner.tsx`:

```tsx
import { ApiError } from '../lib/api-error';

export interface ErrorBannerProps {
  error: unknown;
  onDismiss?: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  if (!error) return null;

  const messages =
    error instanceof ApiError
      ? error.errors.map((e) => e.message)
      : [error instanceof Error ? error.message : String(error)];

  return (
    <div
      role="alert"
      className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-800"
    >
      <div className="flex items-start justify-between gap-4">
        <ul className="list-disc pl-5 text-sm space-y-1">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
        {onDismiss ? (
          <button
            type="button"
            className="text-sm font-medium text-red-700 hover:underline"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- ErrorBanner`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ErrorBanner.tsx apps/web/src/components/ErrorBanner.test.tsx
git commit -m "feat(web): add ErrorBanner component"
```

---

## Task 12: `PokemonCard` component (TDD)

**Files:**
- Create: `apps/web/src/components/PokemonCard.tsx`
- Test: `apps/web/src/components/PokemonCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PokemonCard } from './PokemonCard';
import { bulbasaur } from '../test/fixtures';

describe('PokemonCard', () => {
  it('renders the name, weight in kg, and types', () => {
    render(
      <PokemonCard pokemon={bulbasaur} selected={false} onToggle={() => {}} />,
    );
    expect(screen.getByText('bulbasaur')).toBeInTheDocument();
    expect(screen.getByText('6.9 kg')).toBeInTheDocument();
    expect(screen.getByText('grass')).toBeInTheDocument();
    expect(screen.getByText('poison')).toBeInTheDocument();
  });

  it('reflects the selected state on the toggle button', () => {
    render(
      <PokemonCard pokemon={bulbasaur} selected onToggle={() => {}} />,
    );
    const button = screen.getByRole('button', { name: /bulbasaur/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onToggle when the card button is activated', async () => {
    const onToggle = vi.fn();
    render(
      <PokemonCard pokemon={bulbasaur} selected={false} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /bulbasaur/i }));
    expect(onToggle).toHaveBeenCalledWith(bulbasaur);
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- PokemonCard`
Expected: FAIL.

- [ ] **Step 3: Implement**

`apps/web/src/components/PokemonCard.tsx`:

```tsx
import type { CatalogItem } from '../api/types';
import { formatWeight } from '../lib/format';

export interface PokemonCardProps {
  pokemon: CatalogItem;
  selected: boolean;
  onToggle: (pokemon: CatalogItem) => void;
}

export function PokemonCard({ pokemon, selected, onToggle }: PokemonCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Toggle ${pokemon.name}`}
      onClick={() => onToggle(pokemon)}
      className={[
        'flex flex-col items-center gap-2 rounded-lg border bg-white p-3 text-center transition',
        selected
          ? 'border-brand-500 ring-2 ring-brand-500/30'
          : 'border-slate-200 hover:border-brand-500',
      ].join(' ')}
    >
      {pokemon.sprite ? (
        <img
          src={pokemon.sprite}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          className="h-20 w-20 object-contain"
        />
      ) : (
        <div className="h-20 w-20 rounded bg-slate-100" />
      )}
      <div className="text-sm font-semibold capitalize">{pokemon.name}</div>
      <div className="text-xs text-slate-500">{formatWeight(pokemon.weight)}</div>
      <div className="flex flex-wrap justify-center gap-1">
        {pokemon.types.map((t) => (
          <span
            key={t}
            className="rounded bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600"
          >
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- PokemonCard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/PokemonCard.tsx apps/web/src/components/PokemonCard.test.tsx
git commit -m "feat(web): add PokemonCard component"
```

---

## Task 13: `ListCard` component (TDD)

**Files:**
- Create: `apps/web/src/components/ListCard.tsx`
- Test: `apps/web/src/components/ListCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ListCard } from './ListCard';
import { sampleListSummary } from '../test/fixtures';

describe('ListCard', () => {
  it('renders name, item count, total weight, and a link to the detail page', () => {
    render(
      <MemoryRouter>
        <ListCard summary={sampleListSummary} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Starters')).toBeInTheDocument();
    expect(screen.getByText(/3 pokemon/i)).toBeInTheDocument();
    expect(screen.getByText('24.4 kg')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /starters/i });
    expect(link).toHaveAttribute(
      'href',
      `/lists/${sampleListSummary.id}`,
    );
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- ListCard`
Expected: FAIL.

- [ ] **Step 3: Implement**

`apps/web/src/components/ListCard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { ListSummary } from '../api/types';
import { formatWeight, pluralize } from '../lib/format';

export interface ListCardProps {
  summary: ListSummary;
}

export function ListCard({ summary }: ListCardProps) {
  return (
    <Link
      to={`/lists/${summary.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-500 hover:shadow"
    >
      <h3 className="text-base font-semibold">{summary.name}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          <dt className="uppercase tracking-wide">Items</dt>
          <dd>{pluralize(summary.itemCount, 'pokemon', 'pokemon')}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Weight</dt>
          <dd>{formatWeight(summary.totalWeight)}</dd>
        </div>
      </dl>
    </Link>
  );
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- ListCard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ListCard.tsx apps/web/src/components/ListCard.test.tsx
git commit -m "feat(web): add ListCard component"
```

---

## Task 14: `FileUploader` component (TDD)

**Files:**
- Create: `apps/web/src/components/FileUploader.tsx`
- Test: `apps/web/src/components/FileUploader.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploader } from './FileUploader';

describe('FileUploader', () => {
  it('calls onFile when the user selects a file', async () => {
    const onFile = vi.fn();
    render(<FileUploader onFile={onFile} label="Upload from file" />);
    const input = screen.getByLabelText(/upload from file/i);
    const file = new File(['{}'], 'team.json', { type: 'application/json' });
    await userEvent.upload(input, file);
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile.mock.calls[0][0]).toBeInstanceOf(File);
    expect((onFile.mock.calls[0][0] as File).name).toBe('team.json');
  });

  it('renders a custom accept attribute', () => {
    render(<FileUploader onFile={() => {}} label="x" accept="application/json" />);
    expect(screen.getByLabelText('x')).toHaveAttribute('accept', 'application/json');
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- FileUploader`
Expected: FAIL.

- [ ] **Step 3: Implement**

`apps/web/src/components/FileUploader.tsx`:

```tsx
import { useId, type ChangeEvent } from 'react';

export interface FileUploaderProps {
  label: string;
  onFile: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileUploader({
  label,
  onFile,
  accept = 'application/json,.json',
  disabled = false,
}: FileUploaderProps) {
  const id = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = '';
  };

  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-500"
    >
      {label}
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- FileUploader`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/FileUploader.tsx apps/web/src/components/FileUploader.test.tsx
git commit -m "feat(web): add FileUploader component"
```

---

## Task 15: `ConfirmDialog`, `SkeletonGrid`, `Pagination` (TDD-light)

These are tiny presentational components; one test each, primarily checking accessibility wiring.

**Files:**
- Create: `apps/web/src/components/ConfirmDialog.tsx`
- Create: `apps/web/src/components/SkeletonGrid.tsx`
- Create: `apps/web/src/components/Pagination.tsx`
- Test: `apps/web/src/components/ConfirmDialog.test.tsx`
- Test: `apps/web/src/components/Pagination.test.tsx`

- [ ] **Step 1: Write `ConfirmDialog.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing when not open', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="x" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('invokes onConfirm and onCancel from the action buttons', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete list?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- ConfirmDialog`
Expected: FAIL.

- [ ] **Step 3: Implement `ConfirmDialog.tsx`**

```tsx
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `SkeletonGrid.tsx` (no test — purely cosmetic)**

```tsx
export interface SkeletonGridProps {
  count?: number;
}

export function SkeletonGrid({ count = 12 }: SkeletonGridProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write `Pagination.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('disables Prev on the first page and Next on the last', () => {
    const onPage = vi.fn();
    render(<Pagination page={1} totalPages={3} onPage={onPage} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('emits the requested page through onPage', async () => {
    const onPage = vi.fn();
    render(<Pagination page={2} totalPages={5} onPage={onPage} />);
    await userEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPage).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPage).toHaveBeenCalledWith(3);
  });
});
```

- [ ] **Step 6: Implement `Pagination.tsx`**

```tsx
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, totalPages, onPage }: PaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  return (
    <nav className="flex items-center justify-between text-sm" aria-label="Catalog pagination">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-slate-600">
        Page {page} of {safeTotal}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= safeTotal}
        className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}
```

- [ ] **Step 7: Run all 3 component tests — should pass**

Run: `npm test -w @pokemon/web -- ConfirmDialog Pagination`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/ConfirmDialog.tsx apps/web/src/components/ConfirmDialog.test.tsx apps/web/src/components/SkeletonGrid.tsx apps/web/src/components/Pagination.tsx apps/web/src/components/Pagination.test.tsx
git commit -m "feat(web): add ConfirmDialog, SkeletonGrid, Pagination"
```

---

## Task 16: `SelectedPanel` component (TDD)

The right-hand selection panel on the New-List page. Renders the running selection, the `WeightMeter`, the name input, and the Save button.

**Files:**
- Create: `apps/web/src/components/SelectedPanel.tsx`
- Test: `apps/web/src/components/SelectedPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectedPanel } from './SelectedPanel';
import { bulbasaur, charmander, squirtle } from '../test/fixtures';

const items = [
  { pokemonId: 1, name: 'bulbasaur', weight: 69, sprite: bulbasaur.sprite },
  { pokemonId: 4, name: 'charmander', weight: 85, sprite: charmander.sprite },
  { pokemonId: 7, name: 'squirtle', weight: 90, sprite: squirtle.sprite },
];

describe('SelectedPanel', () => {
  it('renders selected items, the weight meter, and a name input', () => {
    render(
      <SelectedPanel
        name=""
        items={items}
        canSave
        saving={false}
        onNameChange={() => {}}
        onRemove={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByText('bulbasaur')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByLabelText(/list name/i)).toBeInTheDocument();
  });

  it('disables Save when canSave is false', () => {
    render(
      <SelectedPanel
        name=""
        items={[]}
        canSave={false}
        saving={false}
        onNameChange={() => {}}
        onRemove={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('emits onRemove when the user removes an item, and onSave on save', async () => {
    const onRemove = vi.fn();
    const onSave = vi.fn();
    render(
      <SelectedPanel
        name="My team"
        items={items}
        canSave
        saving={false}
        onNameChange={() => {}}
        onRemove={onRemove}
        onSave={onSave}
      />,
    );
    await userEvent.click(screen.getAllByRole('button', { name: /remove bulbasaur/i })[0]);
    expect(onRemove).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('shows a "Saving..." label while saving', () => {
    render(
      <SelectedPanel
        name="x"
        items={items}
        canSave
        saving
        onNameChange={() => {}}
        onRemove={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- SelectedPanel`
Expected: FAIL.

- [ ] **Step 3: Implement**

`apps/web/src/components/SelectedPanel.tsx`:

```tsx
import { WeightMeter } from './WeightMeter';
import { formatWeight } from '../lib/format';

export interface SelectedPanelItem {
  pokemonId: number;
  name: string;
  weight: number;
  sprite: string;
}

export interface SelectedPanelProps {
  name: string;
  items: SelectedPanelItem[];
  canSave: boolean;
  saving: boolean;
  onNameChange: (name: string) => void;
  onRemove: (pokemonId: number) => void;
  onSave: () => void;
}

export function SelectedPanel({
  name,
  items,
  canSave,
  saving,
  onNameChange,
  onRemove,
  onSave,
}: SelectedPanelProps) {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const uniqueSpecies = new Set(items.map((i) => i.pokemonId)).size;

  return (
    <aside className="sticky top-4 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Your selection</h2>
      <WeightMeter weight={totalWeight} species={uniqueSpecies} />
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="list-name">
          List name
        </label>
        <input
          id="list-name"
          type="text"
          value={name}
          maxLength={80}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="My team"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <ul className="flex flex-col divide-y divide-slate-100">
        {items.length === 0 ? (
          <li className="py-3 text-sm text-slate-500">Nothing picked yet.</li>
        ) : (
          items.map((item) => (
            <li
              key={item.pokemonId}
              className="flex items-center gap-3 py-2 text-sm"
            >
              {item.sprite ? (
                <img src={item.sprite} alt="" className="h-8 w-8" />
              ) : (
                <div className="h-8 w-8 rounded bg-slate-100" />
              )}
              <span className="flex-1 capitalize">{item.name}</span>
              <span className="text-xs text-slate-500">
                {formatWeight(item.weight)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(item.pokemonId)}
                aria-label={`Remove ${item.name}`}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave || saving}
        className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save list'}
      </button>
    </aside>
  );
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- SelectedPanel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/SelectedPanel.tsx apps/web/src/components/SelectedPanel.test.tsx
git commit -m "feat(web): add SelectedPanel component"
```

---

## Task 17: `AppLayout` and router shell (TDD)

**Files:**
- Create: `apps/web/src/components/AppLayout.tsx`
- Create: `apps/web/src/pages/NotFoundPage.tsx`
- Create: `apps/web/src/router.tsx`
- Test: `apps/web/src/components/AppLayout.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('renders the brand link and the outlet', () => {
    renderWithProviders(null as unknown as React.ReactElement, {
      routes: [
        {
          element: <AppLayout />,
          children: [{ path: '/', element: <div>page-content</div> }],
        },
      ],
      initialEntries: ['/'],
    });
    expect(
      screen.getByRole('link', { name: /pokemon collections/i }),
    ).toHaveAttribute('href', '/');
    expect(screen.getByText('page-content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- AppLayout`
Expected: FAIL.

- [ ] **Step 3: Implement `AppLayout.tsx`**

```tsx
import { Link, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-brand-600">
            Pokemon Collections
          </Link>
          <nav className="flex gap-3 text-sm">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <Link to="/lists/new" className="hover:underline">
              New list
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Implement `NotFoundPage.tsx`**

```tsx
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you requested does not exist.</p>
      <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
        Go home
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Implement `router.tsx` (pages still placeholders — they ship in tasks 18–20)**

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { HomePage } from './pages/HomePage';
import { NewListPage } from './pages/NewListPage';
import { ListDetailPage } from './pages/ListDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/lists/new', element: <NewListPage /> },
      { path: '/lists/:id', element: <ListDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
```

This file imports page modules that exist later in the plan. Add stub modules so the import graph is satisfied — the real implementations land in Tasks 18–20.

`apps/web/src/pages/HomePage.tsx`:

```tsx
export function HomePage() {
  return null;
}
```

`apps/web/src/pages/NewListPage.tsx`:

```tsx
export function NewListPage() {
  return null;
}
```

`apps/web/src/pages/ListDetailPage.tsx`:

```tsx
export function ListDetailPage() {
  return null;
}
```

- [ ] **Step 6: Run — should pass**

Run: `npm test -w @pokemon/web -- AppLayout`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/AppLayout.tsx apps/web/src/components/AppLayout.test.tsx apps/web/src/pages apps/web/src/router.tsx
git commit -m "feat(web): add AppLayout, router shell, page stubs"
```

---

## Task 18: `HomePage` (integration)

**Files:**
- Modify: `apps/web/src/pages/HomePage.tsx`
- Test: `apps/web/src/pages/HomePage.test.tsx`

- [ ] **Step 1: Write the failing integration test**

```tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../test/server';
import { renderWithProviders } from '../test/render';
import { AppLayout } from '../components/AppLayout';
import { HomePage } from './HomePage';
import { NewListPage } from './NewListPage';
import { sampleListSummary } from '../test/fixtures';

const routes = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/lists/new', element: <NewListPage /> },
    ],
  },
];

describe('HomePage', () => {
  it('renders saved lists from the API', async () => {
    renderWithProviders(<></>, { routes, initialEntries: ['/'] });
    expect(await screen.findByText(sampleListSummary.name)).toBeInTheDocument();
  });

  it('shows an empty state when the API returns no lists', async () => {
    server.use(http.get('/api/lists', () => HttpResponse.json([])));
    renderWithProviders(<></>, { routes, initialEntries: ['/'] });
    expect(
      await screen.findByText(/no lists yet/i),
    ).toBeInTheDocument();
  });

  it('navigates to /lists/new when "Create new list" is clicked', async () => {
    renderWithProviders(<></>, { routes, initialEntries: ['/'] });
    await userEvent.click(
      await screen.findByRole('link', { name: /create new list/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/new list/i)).toBeInTheDocument(),
    );
  });

  it('uploads a file from the home page and refreshes the list', async () => {
    server.use(
      http.get('/api/lists', () => HttpResponse.json([sampleListSummary])),
      http.post('/api/lists/upload', async () =>
        HttpResponse.json(
          {
            _id: 'uploaded-id',
            name: 'Uploaded',
            items: [],
            createdAt: '2026-05-08T00:00:00.000Z',
          },
          { status: 201 },
        ),
      ),
    );
    renderWithProviders(<></>, { routes, initialEntries: ['/'] });
    const input = await screen.findByLabelText(/upload from file/i);
    const file = new File(['{}'], 'team.json', { type: 'application/json' });
    await userEvent.upload(input, file);
    await waitFor(() =>
      expect(screen.getByText(/list uploaded/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run — should fail (HomePage is a stub)**

Run: `npm test -w @pokemon/web -- HomePage`
Expected: FAIL.

- [ ] **Step 3: Implement `HomePage.tsx`**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { FileUploader } from '../components/FileUploader';
import { ListCard } from '../components/ListCard';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { useLists } from '../hooks/useLists';
import { useUploadList } from '../hooks/useUploadList';

export function HomePage() {
  const lists = useLists();
  const upload = useUploadList();
  const [flash, setFlash] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setFlash(null);
    upload.mutate(file, {
      onSuccess: () => setFlash('List uploaded.'),
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Saved lists</h1>
        <div className="flex items-center gap-2">
          <FileUploader
            label="Upload from file"
            onFile={handleFile}
            disabled={upload.isPending}
          />
          <Link
            to="/lists/new"
            className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Create new list
          </Link>
        </div>
      </header>

      {flash ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {flash}
        </div>
      ) : null}

      <ErrorBanner error={upload.error ?? lists.error} onDismiss={() => upload.reset()} />

      {lists.isLoading ? (
        <SkeletonGrid count={6} />
      ) : lists.data && lists.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {lists.data.map((summary) => (
            <ListCard key={summary.id} summary={summary} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No lists yet. Create your first one.
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- HomePage`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/HomePage.tsx apps/web/src/pages/HomePage.test.tsx
git commit -m "feat(web): add Home page with saved lists and upload"
```

---

## Task 19: `NewListPage` (integration)

**Files:**
- Modify: `apps/web/src/pages/NewListPage.tsx`
- Test: `apps/web/src/pages/NewListPage.test.tsx`

The page composes the catalog (left) and the `SelectedPanel` (right). It supports search, pagination, picking, naming, saving, and pre-populating from a file. Server-side validation errors render via `ErrorBanner`.

- [ ] **Step 1: Write the failing integration test**

```tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../test/server';
import { renderWithProviders } from '../test/render';
import { AppLayout } from '../components/AppLayout';
import { NewListPage } from './NewListPage';
import { HomePage } from './HomePage';
import { ListDetailPage } from './ListDetailPage';

const routes = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/lists/new', element: <NewListPage /> },
      { path: '/lists/:id', element: <ListDetailPage /> },
    ],
  },
];

describe('NewListPage', () => {
  it('lets the user search, pick three pokemon, name the list, and save it', async () => {
    let createdBody: unknown;
    server.use(
      http.post('/api/lists', async ({ request }) => {
        createdBody = await request.json();
        return HttpResponse.json(
          {
            _id: 'created-list-id',
            name: 'Starters',
            items: [],
            createdAt: '2026-05-08T00:00:00.000Z',
          },
          { status: 201 },
        );
      }),
    );
    renderWithProviders(<></>, { routes, initialEntries: ['/lists/new'] });

    await userEvent.click(
      await screen.findByRole('button', { name: /toggle bulbasaur/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: /toggle charmander/i }));
    await userEvent.click(screen.getByRole('button', { name: /toggle squirtle/i }));

    await userEvent.type(screen.getByLabelText(/list name/i), 'Starters');
    await userEvent.click(screen.getByRole('button', { name: /save list/i }));

    await waitFor(() =>
      expect(createdBody).toEqual({ name: 'Starters', pokemonIds: [1, 4, 7] }),
    );
  });

  it('renders the server-side validation banner when the API rejects', async () => {
    server.use(
      http.post('/api/lists', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            errors: [
              { code: 'WEIGHT_EXCEEDED', message: 'too heavy' },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<></>, { routes, initialEntries: ['/lists/new'] });

    await userEvent.click(await screen.findByRole('button', { name: /toggle bulbasaur/i }));
    await userEvent.click(screen.getByRole('button', { name: /toggle charmander/i }));
    await userEvent.click(screen.getByRole('button', { name: /toggle squirtle/i }));
    await userEvent.type(screen.getByLabelText(/list name/i), 'Heavy');
    await userEvent.click(screen.getByRole('button', { name: /save list/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/too heavy/);
  });

  it('debounces the catalog search', async () => {
    renderWithProviders(<></>, { routes, initialEntries: ['/lists/new'] });
    await screen.findByRole('button', { name: /toggle bulbasaur/i });
    await userEvent.type(screen.getByLabelText(/search pokemon/i), 'pika');
    await waitFor(
      () => expect(screen.queryByRole('button', { name: /toggle bulbasaur/i })).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
    expect(screen.getByRole('button', { name: /toggle pikachu/i })).toBeInTheDocument();
  });

  it('pre-populates the selection when uploading a v1 file', async () => {
    renderWithProviders(<></>, { routes, initialEntries: ['/lists/new'] });
    await screen.findByRole('button', { name: /toggle bulbasaur/i });

    const file = new File(
      [
        JSON.stringify({
          schemaVersion: 1,
          name: 'Imported',
          items: [
            { pokemonId: 1, name: 'bulbasaur', weight: 69 },
            { pokemonId: 4, name: 'charmander', weight: 85 },
          ],
        }),
      ],
      'imported.json',
      { type: 'application/json' },
    );
    const fileInput = screen.getByLabelText(/import draft/i);
    await userEvent.upload(fileInput, file);

    const panel = screen.getByLabelText(/list name/i).closest('aside') as HTMLElement;
    expect(within(panel).getByText('bulbasaur')).toBeInTheDocument();
    expect(within(panel).getByText('charmander')).toBeInTheDocument();
    expect(screen.getByLabelText(/list name/i)).toHaveValue('Imported');
  });

  it('rejects an unsupported file with a banner and no state change', async () => {
    renderWithProviders(<></>, { routes, initialEntries: ['/lists/new'] });
    await screen.findByRole('button', { name: /toggle bulbasaur/i });
    const file = new File(
      [JSON.stringify({ schemaVersion: 99, name: 'X', items: [] })],
      'future.json',
      { type: 'application/json' },
    );
    await userEvent.upload(screen.getByLabelText(/import draft/i), file);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /unsupported schema version/i,
    );
    expect(screen.getByLabelText(/list name/i)).toHaveValue('');
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- NewListPage`
Expected: FAIL.

- [ ] **Step 3: Implement `NewListPage.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListFileCodec } from '@pokemon/shared';
import { ErrorBanner } from '../components/ErrorBanner';
import { FileUploader } from '../components/FileUploader';
import { Pagination } from '../components/Pagination';
import { PokemonCard } from '../components/PokemonCard';
import { SelectedPanel } from '../components/SelectedPanel';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { ApiError } from '../lib/api-error';
import { useCreateList } from '../hooks/useCreateList';
import { useListBuilder } from '../hooks/useListBuilder';
import { usePokemonCatalog } from '../hooks/usePokemonCatalog';

const PAGE_SIZE = 24;

export function NewListPage() {
  const builder = useListBuilder();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [fileError, setFileError] = useState<Error | null>(null);
  const navigate = useNavigate();
  const create = useCreateList();

  const catalog = usePokemonCatalog({ page, limit: PAGE_SIZE, search });

  // Reset to page 1 when the search term changes (catalog hook debounces internally).
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = useMemo(() => {
    if (!catalog.data) return 1;
    return Math.max(1, Math.ceil(catalog.data.total / catalog.data.limit));
  }, [catalog.data]);

  const handleSave = () => {
    if (!builder.validation.ok || !builder.name.trim()) return;
    create.mutate(
      {
        name: builder.name.trim(),
        pokemonIds: builder.items.map((i) => i.pokemonId),
      },
      {
        onSuccess: (saved) => {
          builder.clear();
          navigate(`/lists/${saved._id}`);
        },
      },
    );
  };

  const handleImport = async (file: File) => {
    setFileError(null);
    const text = await file.text();
    const decoded = ListFileCodec.decode(text);
    if (!decoded.ok) {
      setFileError(new ApiError(400, [decoded.error]));
      return;
    }
    builder.setFromFile({ name: decoded.value.name, items: decoded.value.items });
  };

  const canSave =
    builder.validation.ok && builder.name.trim().length > 0 && !create.isPending;

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">New list</h1>
          <FileUploader label="Import draft" onFile={handleImport} />
        </header>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Search pokemon</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="bulb, char, pika..."
            className="rounded border border-slate-300 px-3 py-1.5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>

        {catalog.isLoading ? (
          <SkeletonGrid count={12} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {catalog.data?.items.map((p) => (
              <PokemonCard
                key={p.id}
                pokemon={p}
                selected={builder.isSelected(p.id)}
                onToggle={builder.toggle}
              />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>

      <div className="flex flex-col gap-4">
        <ErrorBanner
          error={fileError ?? create.error ?? catalog.error}
          onDismiss={() => {
            setFileError(null);
            create.reset();
          }}
        />
        <SelectedPanel
          name={builder.name}
          items={builder.items}
          canSave={canSave}
          saving={create.isPending}
          onNameChange={builder.setName}
          onRemove={(pokemonId) => {
            const item = builder.items.find((i) => i.pokemonId === pokemonId);
            if (!item) return;
            builder.toggle({
              id: item.pokemonId,
              name: item.name,
              weight: item.weight,
              sprite: item.sprite,
              types: [],
            });
          }}
          onSave={handleSave}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- NewListPage`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/NewListPage.tsx apps/web/src/pages/NewListPage.test.tsx
git commit -m "feat(web): add NewListPage with catalog, selection, and save"
```

---

## Task 20: `ListDetailPage` (integration)

Renders a saved list with download and delete actions; delete asks for confirmation and then routes home.

**Files:**
- Modify: `apps/web/src/pages/ListDetailPage.tsx`
- Test: `apps/web/src/pages/ListDetailPage.test.tsx`

- [ ] **Step 1: Write the failing integration test**

```tsx
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../test/server';
import { renderWithProviders } from '../test/render';
import { AppLayout } from '../components/AppLayout';
import { ListDetailPage } from './ListDetailPage';
import { HomePage } from './HomePage';
import { sampleListDetail } from '../test/fixtures';

const routes = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/lists/:id', element: <ListDetailPage /> },
    ],
  },
];

describe('ListDetailPage', () => {
  it('renders the list name and its items', async () => {
    renderWithProviders(<></>, {
      routes,
      initialEntries: [`/lists/${sampleListDetail._id}`],
    });
    expect(await screen.findByRole('heading', { name: /starters/i })).toBeInTheDocument();
    expect(screen.getByText('bulbasaur')).toBeInTheDocument();
    expect(screen.getByText('charmander')).toBeInTheDocument();
    expect(screen.getByText('squirtle')).toBeInTheDocument();
  });

  it('exposes a download link with the canonical href', async () => {
    renderWithProviders(<></>, {
      routes,
      initialEntries: [`/lists/${sampleListDetail._id}`],
    });
    const link = await screen.findByRole('link', { name: /download/i });
    expect(link).toHaveAttribute('href', `/api/lists/${sampleListDetail._id}/download`);
  });

  it('confirms before deleting and routes back home on success', async () => {
    let deleted = false;
    server.use(
      http.delete('/api/lists/:id', () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<></>, {
      routes,
      initialEntries: [`/lists/${sampleListDetail._id}`],
    });
    await userEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(deleted).toBe(true));
    expect(await screen.findByText(/saved lists/i)).toBeInTheDocument();
  });

  it('renders the error banner when the list is not found', async () => {
    server.use(
      http.get('/api/lists/:id', () =>
        HttpResponse.json(
          { statusCode: 404, errors: [{ code: 'NOT_FOUND', message: 'List not found.' }] },
          { status: 404 },
        ),
      ),
    );
    renderWithProviders(<></>, {
      routes,
      initialEntries: ['/lists/missing'],
    });
    expect(await screen.findByText(/list not found/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — should fail**

Run: `npm test -w @pokemon/web -- ListDetailPage`
Expected: FAIL.

- [ ] **Step 3: Implement `ListDetailPage.tsx`**

```tsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorBanner } from '../components/ErrorBanner';
import { WeightMeter } from '../components/WeightMeter';
import { downloadListUrl } from '../api/lists';
import { useDeleteList } from '../hooks/useDeleteList';
import { useList } from '../hooks/useList';
import { formatWeight } from '../lib/format';

export function ListDetailPage() {
  const params = useParams<{ id: string }>();
  const list = useList(params.id);
  const remove = useDeleteList();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const totalWeight =
    list.data?.items.reduce((sum, item) => sum + item.weight, 0) ?? 0;
  const uniqueSpecies = new Set(
    (list.data?.items ?? []).map((item) => item.pokemonId),
  ).size;

  const handleDelete = () => {
    if (!params.id) return;
    remove.mutate(params.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        navigate('/');
      },
    });
  };

  if (list.error) {
    return <ErrorBanner error={list.error} />;
  }

  if (!list.data) {
    return <p className="text-slate-500">Loading list...</p>;
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{list.data.name}</h1>
          <p className="text-sm text-slate-500">
            Created {new Date(list.data.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={downloadListUrl(list.data._id)}
            className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            reloadDocument
            download
          >
            Download
          </Link>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </header>

      <WeightMeter weight={totalWeight} species={uniqueSpecies} />

      <ErrorBanner error={remove.error} onDismiss={() => remove.reset()} />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {list.data.items.map((item) => (
          <li
            key={item.pokemonId}
            className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-3 text-center"
          >
            {item.sprite ? (
              <img src={item.sprite} alt="" className="h-20 w-20" />
            ) : (
              <div className="h-20 w-20 rounded bg-slate-100" />
            )}
            <span className="mt-2 text-sm font-medium capitalize">
              {item.name}
            </span>
            <span className="text-xs text-slate-500">
              {formatWeight(item.weight)}
            </span>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete list?"
        message="This permanently removes the list and its items."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
```

- [ ] **Step 4: Run — should pass**

Run: `npm test -w @pokemon/web -- ListDetailPage`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/ListDetailPage.tsx apps/web/src/pages/ListDetailPage.test.tsx
git commit -m "feat(web): add ListDetailPage with download and delete"
```

---

## Task 21: Wire `App`, `main.tsx`, providers; remove harness sanity test

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/main.tsx`
- Delete: `apps/web/src/App.test.tsx`

- [ ] **Step 1: Replace `App.tsx` with the providers shell**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Verify `main.tsx` already imports `./index.css` and renders `<App />` (it does, from Task 1) — no change needed**

- [ ] **Step 3: Delete the harness sanity test**

Run: `rm apps/web/src/App.test.tsx`

- [ ] **Step 4: Run the full web test suite**

Run: `npm test -w @pokemon/web`
Expected: every test PASS, no `App.test.tsx` in output.

- [ ] **Step 5: Run typecheck and build**

Run: `npm run typecheck -w @pokemon/web && npm run build -w @pokemon/web`
Expected: both succeed; `apps/web/dist/index.html` exists.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx
git rm apps/web/src/App.test.tsx
git commit -m "feat(web): wire QueryClientProvider and RouterProvider"
```

---

## Task 22: End-to-end smoke run against the real API

This task is a manual verification step plus a README touch-up. The plan is not finished until the dev stack actually shows the feature in a browser.

**Files:**
- Modify: `README.md` (add a brief "Web app" section)

- [ ] **Step 1: Bring up the stack**

Run: `docker compose up --build`
Expected: `mongo`, `api`, `web` containers reach a healthy state. The web app is reachable at <http://localhost:5173>.

- [ ] **Step 2: Smoke-test the golden path manually**

In the browser:

1. Visit `/` — see "No lists yet" or any pre-existing lists.
2. Click *Create new list* → catalog renders with sprites; type a search term → results filter after ~300ms.
3. Pick three different pokemon; meter updates; type a name; click *Save list* → routed to `/lists/:id`.
4. Click *Download* → browser downloads a `<slug>.json` file.
5. Click *Delete* → confirm → routed to `/`; the list is gone.
6. On `/`, click *Upload from file* and select the file from step 4 → success banner appears; the list reappears.
7. On `/lists/new`, click *Import draft* with the same file → the right panel pre-populates with the items and the name.

If any step fails, **STOP and report the failure**. Do not "fix forward" by editing the spec.

- [ ] **Step 3: Add a "Web app" subsection to the root README**

Insert this block after the "API reference" section in `README.md`:

```markdown
## Web app

The SPA is at <http://localhost:5173> when the dev stack is up.

Routes:

| Path             | Purpose                                                  |
|------------------|----------------------------------------------------------|
| `/`              | All saved lists; create new list; upload from file.      |
| `/lists/new`     | Browse the catalog (search + paginate), pick pokemon, save. |
| `/lists/:id`     | View a saved list, download it, or delete it.            |

The web app never calls PokéAPI directly — every request goes through `/api`, which Vite proxies to the NestJS service in dev and nginx reverse-proxies in production.
```

- [ ] **Step 4: Final test pass and commit**

Run: `npm test`
Expected: every workspace's test script returns 0.

```bash
git add README.md
git commit -m "docs: document web app routes"
```

---

## Self-Review (executed before declaring the plan finished)

**Spec coverage check:**

- 2.1 Pages and flows — Home (Task 18), New list (Task 19), List detail (Task 20). ✓
- 2.2 Validation — `useListBuilder` derives `validation` from shared `ListValidator` (Task 8); server-side errors render via `ErrorBanner` (Task 19 second test). ✓
- 2.3 File format — uses `ListFileCodec` from `@pokemon/shared` for both client-side preview decoding (Task 19) and server upload (Task 18 + Task 19 file uploads land at `POST /lists/upload` and `setFromFile` respectively). ✓
- 5.1 Components — every component listed in the spec has a dedicated task (`PokemonCard`, `ListCard`, `WeightMeter`, `FileUploader`, `ErrorBanner`). Plus `SelectedPanel`, `ConfirmDialog`, `Pagination`, `SkeletonGrid`, `AppLayout` for completeness. ✓
- 5.2 State — TanStack Query for server state (Task 9), `useListBuilder` reducer hook (Task 8), debounced search hook (Task 7), MSW for tests (Task 2). ✓
- 5.4 UX — skeletons in catalog (Task 19), single banner for errors (Tasks 18/19/20), upload preview on `NewListPage` (Task 19 fourth test), confirm dialog before delete (Task 20 third test). ✓
- 7.2 Frontend testing — every hook and component has a test; pages have integration tests with MSW. ✓

**Placeholder scan:** no "TBD", "implement later", or "similar to". Each step contains the actual code or command. The page stubs in Task 17 are explicit and replaced in Tasks 18–20.

**Type / API consistency:**

- `CatalogItem` shape used in `PokemonCard`, `useListBuilder.toggle`, MSW handlers — identical fields (`id, name, weight, sprite, types`). ✓
- `BuilderItem` mirrors backend `PokemonSnapshot` minus extra fields — mapped explicitly when constructing the `pokemonIds[]` payload. ✓
- API-error parsing flows through `ApiError` everywhere (`apiFetch`, hooks, `ErrorBanner`). ✓
- All endpoints used by hooks match the backend surface from `apps/api/src/lists/lists.controller.ts` and `apps/api/src/pokemon/pokemon.controller.ts`. ✓

---

## Exit Criteria

- `npm test` from the repo root returns 0 (shared, api, and web suites all green).
- `npm run typecheck -w @pokemon/web` and `npm run build -w @pokemon/web` succeed.
- `docker compose up --build` brings up a stack where the seven manual smoke-test steps in Task 22 succeed end-to-end against the real Mongo + API.
- README has a "Web app" section.
- No `App.test.tsx` placeholder remains in the repo.
- No commit message includes a `Co-Authored-By: Claude` trailer.

## Out of scope (deferred)

- Per-component story / Storybook coverage.
- Real-browser end-to-end tests (Playwright / Cypress).
- i18n.
- Optimistic updates for delete/upload.
- Production-grade Dockerfiles for the web app (nginx multi-stage build) — they live in a separate "ship" plan if/when reviewers want a built bundle instead of `vite dev`.
