import { useState } from "react";
import { X } from "lucide-react";
import { createResource } from "../lib/resources";
import { createPolicyRule } from "../lib/policy";
import type { Resource } from "../types";

const ROLE_ORDER = [
  { name: "viewer", rank: 1 },
  { name: "editor", rank: 2 },
  { name: "admin", rank: 3 },
];

const rankOf = (name: string) =>
  ROLE_ORDER.find((r) => r.name === name)?.rank ?? 0;

interface CreateResourceModalProps {
  onClose: () => void;
  onCreated: (resource: Resource) => void;
}

export const CreateResourceModal = ({
  onClose,
  onCreated,
}: CreateResourceModalProps) => {
  const [name, setName] = useState("");
  const [requiredRoleName, setRequiredRoleName] = useState("viewer");

  const [addRule, setAddRule] = useState(false);
  const [ruleMaxRoleName, setRuleMaxRoleName] = useState("viewer");
  const [ruleMaxDuration, setRuleMaxDuration] = useState("1440");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const eligibleMaxRoles = ROLE_ORDER.filter(
    (r) => r.rank >= rankOf(requiredRoleName),
  );

  const handleRequiredRoleChange = (value: string) => {
    setRequiredRoleName(value);
    // Keep the auto-approve ceiling from falling below the new floor.
    if (rankOf(ruleMaxRoleName) < rankOf(value)) {
      setRuleMaxRoleName(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (addRule && ruleMaxDuration === "") {
      setError("Enter a max duration for the policy rule");
      return;
    }

    setCreating(true);
    try {
      const resource = await createResource(name, requiredRoleName);

      if (addRule) {
        try {
          await createPolicyRule({
            resourceId: resource.id,
            autoApprove: true,
            maxRoleName: ruleMaxRoleName,
            condition: { maxDuration: Number(ruleMaxDuration) },
          });
        } catch (ruleErr: any) {
          onCreated(resource);
          setCreating(false);
          setError(
            `Resource created, but the policy rule failed to save: ${
              ruleErr.response?.data?.message || "unknown error"
            }. You can add it from Edit.`,
          );
          return;
        }
      }

      onCreated(resource);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create resource");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border-dark bg-surface-raised">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
          <p className="text-sm font-mono font-semibold uppercase tracking-widest text-on-dark">
            Create_Resource
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
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Resource name"
              className="w-full rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
              Required Role
            </label>
            <select
              value={requiredRoleName}
              onChange={(e) => handleRequiredRoleChange(e.target.value)}
              className="w-full rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="rounded-md border border-border-dark bg-bg p-3">
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-on-dark">
              <input
                type="checkbox"
                checked={addRule}
                onChange={(e) => setAddRule(e.target.checked)}
                className="accent-brand"
              />
              Add auto-approve policy rule
            </label>

            {addRule && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
                    Max Auto-Approved Role
                  </label>
                  <select
                    value={ruleMaxRoleName}
                    onChange={(e) => setRuleMaxRoleName(e.target.value)}
                    className="w-full rounded-md border border-border-dark bg-surface-raised px-3 py-2 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    {eligibleMaxRoles.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name[0].toUpperCase() + r.name.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-on-dark-muted">
                    Must be at or above the required role. Requests at or below
                    this role and duration will be auto-approved.
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
                    Max Duration (minutes)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ruleMaxDuration}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d+$/.test(v)) {
                        setRuleMaxDuration(v);
                      }
                    }}
                    placeholder="e.g. 60"
                    className="w-full rounded-md border border-border-dark bg-surface-raised px-3 py-2 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
            )}
          </div>

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
              disabled={creating}
              className="rounded-md bg-brand px-5 py-2 text-xs font-mono font-semibold uppercase tracking-wide text-white hover:bg-brand-hover disabled:opacity-50 transition"
            >
              {creating ? "Creating..." : "Create_Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
