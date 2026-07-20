export const ResourceDetailSkeleton = () => (
  <div className="max-w-5xl animate-pulse">
    <div className="h-3 w-32 rounded bg-border-dark" />
    <div className="mt-3 h-7 w-64 rounded bg-border-dark" />
    <div className="mt-2 h-4 w-48 rounded bg-border-dark" />

    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-border-dark bg-surface-raised p-5">
          <div className="h-3 w-24 rounded bg-border-dark mb-3" />
          <div className="h-12 rounded bg-bg" />
        </div>
      </div>
      <div className="rounded-xl border border-border-dark bg-surface-raised p-5 space-y-4">
        <div className="h-3 w-16 rounded bg-border-dark" />
        <div className="h-3 w-full rounded bg-border-dark" />
        <div className="h-3 w-full rounded bg-border-dark" />
        <div className="h-3 w-2/3 rounded bg-border-dark" />
      </div>
    </div>
  </div>
);
