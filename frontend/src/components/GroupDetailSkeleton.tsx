export const GroupDetailSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-3 w-24 bg-border-dark rounded" />
    <div className="mt-3 flex items-center justify-between">
      <div>
        <div className="h-7 w-48 bg-border-dark rounded" />
        <div className="mt-2 h-4 w-64 bg-border-dark rounded" />
      </div>
      <div className="h-9 w-28 bg-border-dark rounded-md" />
    </div>
    <div className="mt-6 rounded-xl border border-border-dark bg-surface-raised overflow-hidden">
      <div className="h-12 border-b border-border-dark" />
      <div className="h-14 border-b border-border-dark" />
      <div className="h-14 border-b border-border-dark" />
      <div className="h-14" />
    </div>
  </div>
);
