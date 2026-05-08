import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PokemonCard } from './PokemonCard';
import { bulbasaur } from '../test/fixtures';

describe('PokemonCard', () => {
  it('renders the name, weight in kg, and types', () => {
    render(
      <PokemonCard pokemon={bulbasaur} selected={false} onToggle={() => {}} />,
    );
    expect(screen.getByText('bulbasaur')).toBeInTheDocument();
    expect(screen.getByText('6.9 kg')).toBeInTheDocument();
    expect(screen.getByText('grass')).toBeInTheDocument();
    expect(screen.getByText('poison')).toBeInTheDocument();
  });

  it('reflects the selected state on the toggle button', () => {
    render(
      <PokemonCard pokemon={bulbasaur} selected onToggle={() => {}} />,
    );
    const button = screen.getByRole('button', { name: /bulbasaur/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onToggle when the card button is activated', async () => {
    const onToggle = vi.fn();
    render(
      <PokemonCard pokemon={bulbasaur} selected={false} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /bulbasaur/i }));
    expect(onToggle).toHaveBeenCalledWith(bulbasaur);
  });
});
