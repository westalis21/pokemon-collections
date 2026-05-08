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
