interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal = ({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border-dark bg-surface-raised p-5">
        <p className="text-sm font-mono font-semibold uppercase tracking-widest text-on-dark">
          {title}
        </p>
        <p className="mt-3 text-sm text-on-dark-muted">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="text-xs font-mono uppercase tracking-wide text-on-dark-muted cursor-pointer hover:text-on-dark transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-5 py-2 text-xs font-mono font-semibold uppercase tracking-wide text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition ${
              danger
                ? "bg-danger hover:bg-danger/80"
                : "bg-brand hover:bg-brand-hover"
            }`}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
