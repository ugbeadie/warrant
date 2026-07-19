export const SkeletonRow = () => {
  return (
    <div className="px-5 py-4 border-b border-border-dark last:border-0 animate-pulse">
      <div className="h-3.5 w-3/4 rounded bg-border-dark" />
      <div className="mt-2 h-3 w-24 rounded bg-border-dark" />
    </div>
  );
};
