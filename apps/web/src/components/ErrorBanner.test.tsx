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
