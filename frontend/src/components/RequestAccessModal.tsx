import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { createAccessRequest } from "../lib/requests";
import { fetchPolicyRulesForResource } from "../lib/resources";
import type { Resource } from "../types";

const DURATION_OPTIONS = [
  { label: "1 Hour", minutes: 60 },
  { label: "4 Hours", minutes: 240 },
  { label: "1 Day", minutes: 1440 },
  { label: "1 Week", minutes: 10080 },
  { label: "Custom", minutes: -1 },
];

// Keep in sync with your seeded Role.rank values.
const ROLE_RANKS: Record<string, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

interface RequestAccessModalProps {
  resource: Resource;
  isOwner?: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export const RequestAccessModal = ({
  resource,
  isOwner = false,
  onClose,
  onSubmitted,
}: RequestAccessModalProps) => {
  const [requestedRoleName, setRequestedRoleName] = useState("viewer");
  const [durationChoice, setDurationChoice] = useState(60);
  const [customValue, setCustomValue] = useState(2);
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours" | "days">(
    "hours",
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [likelyAutoApprove, setLikelyAutoApprove] = useState(false);

  const isCustom = durationChoice === -1;

  const durationMinutes = useMemo(() => {
    if (!isCustom) return durationChoice;
    const multiplier =
      customUnit === "minutes" ? 1 : customUnit === "hours" ? 60 : 1440;
    return Math.max(1, Math.round(customValue * multiplier));
  }, [isCustom, durationChoice, customValue, customUnit]);

  useEffect(() => {
    if (isOwner) return;

    fetchPolicyRulesForResource(resource.id)
      .then((rules) => {
        const requestedRank = ROLE_RANKS[requestedRoleName] ?? Infinity;

        const match = rules.some((r) => {
          if (!r.autoApprove) return false;

          if (
            r.condition.maxDuration &&
            durationMinutes > r.condition.maxDuration
          ) {
            return false;
          }

          const maxRank = r.maxRole?.rank ?? -1;
          return requestedRank <= maxRank;
        });

        setLikelyAutoApprove(match);
      })
      .catch(() => setLikelyAutoApprove(false));
  }, [resource.id, durationMinutes, requestedRoleName, isOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isCustom && durationMinutes < 1) {
      setError("Duration must be at least 1 minute");
      return;
    }

    setSubmitting(true);
    try {
      await createAccessRequest({
        resourceId: resource.id,
        requestedRoleName,
        reason,
        durationMinutes,
      });
      onSubmitted();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border-dark bg-surface-raised">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
          <p className="text-sm font-mono font-semibold uppercase tracking-widest text-on-dark">
            Request_Access
          </p>
          <button
            onClick={onClose}
            className="text-on-dark-muted hover:text-on-dark transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
              Resource
            </label>
            <div className="rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark">
              {resource.name}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
              Requested Role
            </label>
            <select
              value={requestedRoleName}
              onChange={(e) => setRequestedRoleName(e.target.value)}
              className="w-full rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="viewer">Viewer (Read-only)</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
              Duration
            </label>
            <select
              value={durationChoice}
              onChange={(e) => setDurationChoice(Number(e.target.value))}
              className="w-full rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.minutes}>
                  {opt.label}
                </option>
              ))}
            </select>

            {isCustom && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={customValue}
                  onChange={(e) => setCustomValue(Number(e.target.value))}
                  className="w-24 rounded-md border border-border-dark bg-bg px-3 py-2 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as any)}
                  className="flex-1 rounded-md border border-border-dark bg-bg px-3 py-2 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
              Justification
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Provide a business reason..."
              className="w-full rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark placeholder:text-on-dark-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
            />
          </div>

          {isOwner ? (
            <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
              You own this resource — this will auto-approve instantly and be
              logged for audit purposes.
            </div>
          ) : likelyAutoApprove ? (
            <div className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
              This request will likely be auto-approved based on policy.
            </div>
          ) : (
            <div className="rounded-md border border-brand/20 bg-brand/10 px-3 py-2 text-xs text-brand">
              This request requires approval from{" "}
              <span className="font-semibold">{resource.owner.username}</span>.
            </div>
          )}

          {error && <p className="text-xs text-danger font-mono">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-mono uppercase tracking-wide text-on-dark-muted hover:text-on-dark transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand px-5 py-2 text-xs font-mono font-semibold uppercase tracking-wide text-white hover:bg-brand-hover disabled:opacity-50 transition"
            >
              {submitting ? "Submitting..." : "Submit_Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
