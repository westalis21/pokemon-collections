import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorBanner } from '../components/ErrorBanner';
import { WeightMeter } from '../components/WeightMeter';
import { downloadListUrl } from '../api/lists';
import { useDeleteList } from '../hooks/useDeleteList';
import { useList } from '../hooks/useList';
import { formatWeight } from '../lib/format';

export function ListDetailPage() {
  const params = useParams<{ id: string }>();
  const list = useList(params.id);
  const remove = useDeleteList();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const totalWeight =
    list.data?.items.reduce((sum, item) => sum + item.weight, 0) ?? 0;
  const uniqueSpecies = new Set(
    (list.data?.items ?? []).map((item) => item.pokemonId),
  ).size;

  const handleDelete = () => {
    if (!params.id) return;
    remove.mutate(params.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        navigate('/');
      },
    });
  };

  if (list.error) {
    return <ErrorBanner error={list.error} />;
  }

  if (!list.data) {
    return <p className="text-slate-500">Loading list...</p>;
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{list.data.name}</h1>
          <p className="text-sm text-slate-500">
            Created {new Date(list.data.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={downloadListUrl(list.data._id)}
            className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            reloadDocument
            download
          >
            Download
          </Link>
          <button
            type="button"
            aria-label="Delete list"
            onClick={() => setConfirmOpen(true)}
            className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </header>

      <WeightMeter weight={totalWeight} species={uniqueSpecies} />

      <ErrorBanner error={remove.error} onDismiss={() => remove.reset()} />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {list.data.items.map((item) => (
          <li
            key={item.pokemonId}
            className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-3 text-center"
          >
            {item.sprite ? (
              <img src={item.sprite} alt="" className="h-20 w-20" />
            ) : (
              <div className="h-20 w-20 rounded bg-slate-100" />
            )}
            <span className="mt-2 text-sm font-medium capitalize">
              {item.name}
            </span>
            <span className="text-xs text-slate-500">
              {formatWeight(item.weight)}
            </span>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete list?"
        message="This permanently removes the list and its items."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
