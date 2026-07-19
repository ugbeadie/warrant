export const SkeletonCard = () => {
  return (
    <div className="rounded-xl border border-border-dark bg-surface-raised p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-border-dark" />
        <div className="h-3 w-3 rounded bg-border-dark" />
      </div>
      <div className="mt-3 h-8 w-12 rounded bg-border-dark" />
      <div className="mt-2 h-3 w-24 rounded bg-border-dark" />
    </div>
  );
};
