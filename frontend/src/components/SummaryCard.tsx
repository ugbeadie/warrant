import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface SummaryCardProps {
  label: string;
  value: number;
  accent?: "brand" | "warning" | "danger";
  icon?: ReactNode;
  linkTo?: string;
  linkLabel?: string;
  description?: string;
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
  icon,
  linkTo,
  linkLabel,
  description,
}: SummaryCardProps) => {
  return (
    <div className="rounded-xl border border-border-dark bg-surface-raised px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
          {label}
        </p>
        {icon && <span className={ACCENT_MAP[accent]}>{icon}</span>}
      </div>
      <p className={`mt-3 text-3xl font-semibold font-mono text-on-dark`}>
        {value}
      </p>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className="mt-2 inline-block text-xs font-medium text-brand hover:text-brand-hover"
        >
          {linkLabel}
        </Link>
      )}
      {description && (
        <p className="mt-2 text-xs text-on-dark-muted">{description}</p>
      )}
    </div>
  );
};
