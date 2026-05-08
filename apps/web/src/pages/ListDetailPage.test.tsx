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
