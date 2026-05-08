import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { FileUploader } from '../components/FileUploader';
import { ListCard } from '../components/ListCard';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { useLists } from '../hooks/useLists';
import { useUploadList } from '../hooks/useUploadList';

export function HomePage() {
  const lists = useLists();
  const upload = useUploadList();
  const [flash, setFlash] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setFlash(null);
    upload.mutate(file, {
      onSuccess: () => setFlash('List uploaded.'),
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Saved lists</h1>
        <div className="flex items-center gap-2">
          <FileUploader
            label="Upload from file"
            onFile={handleFile}
            disabled={upload.isPending}
          />
          <Link
            to="/lists/new"
            className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Create new list
          </Link>
        </div>
      </header>

      {flash ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {flash}
        </div>
      ) : null}

      <ErrorBanner error={upload.error ?? lists.error} onDismiss={() => upload.reset()} />

      {lists.isLoading ? (
        <SkeletonGrid count={6} />
      ) : lists.data && lists.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {lists.data.map((summary) => (
            <ListCard key={summary.id} summary={summary} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No lists yet. Create your first one.
        </div>
      )}
    </section>
  );
}
