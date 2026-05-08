import { describe, it, expect } from 'vitest';
import { renderWithProviders } from './test/render';

describe('test harness', () => {
  it('renders content with providers', () => {
    const { getByText } = renderWithProviders(<span>hello</span>);
    expect(getByText('hello')).toBeInTheDocument();
  });
});
