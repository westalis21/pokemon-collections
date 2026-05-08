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
