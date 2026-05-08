import { ApiError } from '../lib/api-error';

export interface ErrorBannerProps {
  error: unknown;
  onDismiss?: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  if (!error) return null;

  const messages =
    error instanceof ApiError
      ? error.errors.map((e) => e.message)
      : [error instanceof Error ? error.message : String(error)];

  return (
    <div
      role="alert"
      className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-800"
    >
      <div className="flex items-start justify-between gap-4">
        <ul className="list-disc pl-5 text-sm space-y-1">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
        {onDismiss ? (
          <button
            type="button"
            className="text-sm font-medium text-red-700 hover:underline"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
