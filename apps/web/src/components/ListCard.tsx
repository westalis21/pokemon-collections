import { Link } from 'react-router-dom';
import type { ListSummary } from '../api/types';
import { formatWeight, pluralize } from '../lib/format';

export interface ListCardProps {
  summary: ListSummary;
}

export function ListCard({ summary }: ListCardProps) {
  return (
    <Link
      to={`/lists/${summary.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-500 hover:shadow"
    >
      <h3 className="text-base font-semibold">{summary.name}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          <dt className="uppercase tracking-wide">Items</dt>
          <dd>{pluralize(summary.itemCount, 'pokemon', 'pokemon')}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Weight</dt>
          <dd>{formatWeight(summary.totalWeight)}</dd>
        </div>
      </dl>
    </Link>
  );
}
