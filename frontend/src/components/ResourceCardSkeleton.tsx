export const ResourceCardSkeleton = () => (
  <div className="rounded-xl border border-border-dark bg-surface-raised p-5 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-5 w-5 rounded bg-border-dark" />
      <div className="h-5 w-16 rounded-full bg-border-dark" />
    </div>
    <div className="mt-4 h-4 w-2/3 rounded bg-border-dark" />
    <div className="mt-2 h-3 w-1/2 rounded bg-border-dark" />
    <div className="mt-4 pt-4 border-t border-border-dark flex items-center justify-between">
      <div className="h-3 w-16 rounded bg-border-dark" />
      <div className="h-7 w-16 rounded bg-border-dark" />
    </div>
  </div>
);
