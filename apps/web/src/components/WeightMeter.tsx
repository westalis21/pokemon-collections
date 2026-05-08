import { MAX_TOTAL_WEIGHT } from '@pokemon/shared';
import { formatWeight, pluralize } from '../lib/format';

export interface WeightMeterProps {
  weight: number;
  species: number;
}

export function WeightMeter({ weight, species }: WeightMeterProps) {
  const exceeded = weight > MAX_TOTAL_WEIGHT;
  const clamped = Math.min(weight, MAX_TOTAL_WEIGHT);
  const pct = Math.round((clamped / MAX_TOTAL_WEIGHT) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm font-medium">
        <span>
          {formatWeight(weight)} / {formatWeight(MAX_TOTAL_WEIGHT)}
        </span>
        <span>{pluralize(species, 'species', 'species')}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={MAX_TOTAL_WEIGHT}
        aria-valuenow={clamped}
        data-state={exceeded ? 'exceeded' : 'ok'}
        className="mt-2 h-2 rounded bg-slate-200 overflow-hidden"
      >
        <div
          className={`h-full ${exceeded ? 'bg-red-500' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
