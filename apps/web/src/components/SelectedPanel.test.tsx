import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectedPanel } from './SelectedPanel';
import { bulbasaur, charmander, squirtle } from '../test/fixtures';

const items = [
  { pokemonId: 1, name: 'bulbasaur', weight: 69, sprite: bulbasaur.sprite },
  { pokemonId: 4, name: 'charmander', weight: 85, sprite: charmander.sprite },
  { pokemonId: 7, name: 'squirtle', weight: 90, sprite: squirtle.sprite },
];

describe('SelectedPanel', () => {
  it('renders selected items, the weight meter, and a name input', () => {
    render(
      <SelectedPanel
        name=""
        items={items}
        canSave
        saving={false}
        onNameChange={() => {}}
        onRemove={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByText('bulbasaur')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByLabelText(/list name/i)).toBeInTheDocument();
  });

  it('disables Save when canSave is false', () => {
    render(
      <SelectedPanel
        name=""
        items={[]}
        canSave={false}
        saving={false}
        onNameChange={() => {}}
        onRemove={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('emits onRemove when the user removes an item, and onSave on save', async () => {
    const onRemove = vi.fn();
    const onSave = vi.fn();
    render(
      <SelectedPanel
        name="My team"
        items={items}
        canSave
        saving={false}
        onNameChange={() => {}}
        onRemove={onRemove}
        onSave={onSave}
      />,
    );
    await userEvent.click(screen.getAllByRole('button', { name: /remove bulbasaur/i })[0]);
    expect(onRemove).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('shows a "Saving..." label while saving', () => {
    render(
      <SelectedPanel
        name="x"
        items={items}
        canSave
        saving
        onNameChange={() => {}}
        onRemove={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
