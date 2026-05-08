export interface SkeletonGridProps {
  count?: number;
}

export function SkeletonGrid({ count = 12 }: SkeletonGridProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  );
}
