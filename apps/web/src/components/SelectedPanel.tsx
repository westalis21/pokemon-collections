import type { PokemonSnapshot } from '@pokemon/shared';
import { WeightMeter } from './WeightMeter';
import { formatWeight } from '../lib/format';

export interface SelectedPanelProps {
  name: string;
  items: PokemonSnapshot[];
  canSave: boolean;
  saving: boolean;
  onNameChange: (name: string) => void;
  onRemove: (pokemonId: number) => void;
  onSave: () => void;
}

export function SelectedPanel({
  name,
  items,
  canSave,
  saving,
  onNameChange,
  onRemove,
  onSave,
}: SelectedPanelProps) {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const uniqueSpecies = new Set(items.map((i) => i.pokemonId)).size;

  return (
    <aside className="sticky top-4 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Your selection</h2>
      <WeightMeter weight={totalWeight} species={uniqueSpecies} />
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="list-name">
          List name
        </label>
        <input
          id="list-name"
          type="text"
          value={name}
          maxLength={80}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="My team"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <ul className="flex flex-col divide-y divide-slate-100">
        {items.length === 0 ? (
          <li className="py-3 text-sm text-slate-500">Nothing picked yet.</li>
        ) : (
          items.map((item) => (
            <li
              key={item.pokemonId}
              className="flex items-center gap-3 py-2 text-sm"
            >
              {item.sprite ? (
                <img src={item.sprite} alt="" className="h-8 w-8" />
              ) : (
                <div className="h-8 w-8 rounded bg-slate-100" />
              )}
              <span className="flex-1 capitalize">{item.name}</span>
              <span className="text-xs text-slate-500">
                {formatWeight(item.weight)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(item.pokemonId)}
                aria-label={`Remove ${item.name}`}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave || saving}
        className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save list'}
      </button>
    </aside>
  );
}
