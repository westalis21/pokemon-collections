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
