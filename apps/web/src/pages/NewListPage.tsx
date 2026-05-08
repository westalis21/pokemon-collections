import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListFileCodec } from '@pokemon/shared';
import { ErrorBanner } from '../components/ErrorBanner';
import { FileUploader } from '../components/FileUploader';
import { Pagination } from '../components/Pagination';
import { PokemonCard } from '../components/PokemonCard';
import { SelectedPanel } from '../components/SelectedPanel';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { ApiError } from '../lib/api-error';
import { useCreateList } from '../hooks/useCreateList';
import { useListBuilder } from '../hooks/useListBuilder';
import { usePokemonCatalog } from '../hooks/usePokemonCatalog';

const PAGE_SIZE = 24;

export function NewListPage() {
  const builder = useListBuilder();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [fileError, setFileError] = useState<Error | null>(null);
  const navigate = useNavigate();
  const create = useCreateList();

  const catalog = usePokemonCatalog({ page, limit: PAGE_SIZE, search });

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = useMemo(() => {
    if (!catalog.data) return 1;
    return Math.max(1, Math.ceil(catalog.data.total / catalog.data.limit));
  }, [catalog.data]);

  const handleSave = () => {
    if (!builder.validation.ok || !builder.name.trim()) return;
    create.mutate(
      {
        name: builder.name.trim(),
        pokemonIds: builder.items.map((i) => i.pokemonId),
      },
      {
        onSuccess: (saved) => {
          builder.clear();
          navigate(`/lists/${saved._id}`);
        },
      },
    );
  };

  const handleImport = async (file: File) => {
    setFileError(null);
    const text = await file.text();
    const decoded = ListFileCodec.decode(text);
    if (!decoded.ok) {
      setFileError(new ApiError(400, [decoded.error]));
      return;
    }
    builder.setFromFile({ name: decoded.value.name, items: decoded.value.items });
  };

  const canSave =
    builder.validation.ok && builder.name.trim().length > 0 && !create.isPending;

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">New list</h1>
          <FileUploader label="Import draft" onFile={handleImport} />
        </header>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Search pokemon</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="bulb, char, pika..."
            className="rounded border border-slate-300 px-3 py-1.5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>

        {catalog.isLoading ? (
          <SkeletonGrid count={12} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {catalog.data?.items.map((p) => (
              <PokemonCard
                key={p.id}
                pokemon={p}
                selected={builder.isSelected(p.id)}
                onToggle={builder.toggle}
              />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>

      <div className="flex flex-col gap-4">
        <ErrorBanner
          error={fileError ?? create.error ?? catalog.error}
          onDismiss={() => {
            setFileError(null);
            create.reset();
          }}
        />
        <SelectedPanel
          name={builder.name}
          items={builder.items}
          canSave={canSave}
          saving={create.isPending}
          onNameChange={builder.setName}
          onRemove={(pokemonId) => {
            const item = builder.items.find((i) => i.pokemonId === pokemonId);
            if (!item) return;
            builder.toggle({
              id: item.pokemonId,
              name: item.name,
              weight: item.weight,
              sprite: item.sprite,
              types: [],
            });
          }}
          onSave={handleSave}
        />
      </div>
    </section>
  );
}
