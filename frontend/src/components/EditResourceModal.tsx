import { useState } from "react";
import { X } from "lucide-react";
import { updateResource } from "../lib/resources";
import type { Resource } from "../types";

interface EditResourceModalProps {
  resource: Resource;
  onClose: () => void;
  onUpdated: (resource: Resource) => void;
}

export const EditResourceModal = ({
  resource,
  onClose,
  onUpdated,
}: EditResourceModalProps) => {
  const [name, setName] = useState(resource.name);
  const [requiredRoleName, setRequiredRoleName] = useState(
    resource.requiredRole.name.toLowerCase(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const updated = await updateResource(resource.id, {
        name,
        requiredRoleName,
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update resource");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border-dark bg-surface-raised">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
          <p className="text-sm font-mono font-semibold uppercase tracking-widest text-on-dark">
            Edit_Resource
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
              className="w-full rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
              Required Role
            </label>
            <select
              value={requiredRoleName}
              onChange={(e) => setRequiredRoleName(e.target.value)}
              className="w-full rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
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
              disabled={saving}
              className="rounded-md bg-brand px-5 py-2 text-xs font-mono font-semibold uppercase tracking-wide text-white hover:bg-brand-hover disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save_Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
