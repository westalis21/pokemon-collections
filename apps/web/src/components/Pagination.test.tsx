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
