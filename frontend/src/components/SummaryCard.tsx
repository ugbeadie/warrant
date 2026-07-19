interface SummaryCardProps {
  label: string;
  value: number;
  accent?: "brand" | "warning" | "danger";
}

const ACCENT_MAP = {
  brand: "text-brand",
  warning: "text-warning",
  danger: "text-danger",
};

export const SummaryCard = ({
  label,
  value,
  accent = "brand",
}: SummaryCardProps) => {
  return (
    <div className="rounded-xl border border-border-dark bg-surface-raised px-5 py-4">
      <p className="text-xs font-medium text-on-dark-muted uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold font-mono ${ACCENT_MAP[accent]}`}
      >
        {value}
      </p>
    </div>
  );
};
