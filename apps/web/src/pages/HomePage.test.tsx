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
