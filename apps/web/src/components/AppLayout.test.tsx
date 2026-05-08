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
