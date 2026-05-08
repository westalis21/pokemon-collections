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
