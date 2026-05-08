import type { CatalogItem } from '../api/types';
import { formatWeight } from '../lib/format';

export interface PokemonCardProps {
  pokemon: CatalogItem;
  selected: boolean;
  onToggle: (pokemon: CatalogItem) => void;
}

export function PokemonCard({ pokemon, selected, onToggle }: PokemonCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Toggle ${pokemon.name}`}
      onClick={() => onToggle(pokemon)}
      className={[
        'flex flex-col items-center gap-2 rounded-lg border bg-white p-3 text-center transition',
        selected
          ? 'border-brand-500 ring-2 ring-brand-500/30'
          : 'border-slate-200 hover:border-brand-500',
      ].join(' ')}
    >
      {pokemon.sprite ? (
        <img
          src={pokemon.sprite}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          className="h-20 w-20 object-contain"
        />
      ) : (
        <div className="h-20 w-20 rounded bg-slate-100" />
      )}
      <div className="text-sm font-semibold capitalize">{pokemon.name}</div>
      <div className="text-xs text-slate-500">{formatWeight(pokemon.weight)}</div>
      <div className="flex flex-wrap justify-center gap-1">
        {pokemon.types.map((t) => (
          <span
            key={t}
            className="rounded bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600"
          >
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}
