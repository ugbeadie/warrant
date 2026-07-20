import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Database } from "lucide-react";
import {
  fetchMyResources,
  fetchAllResources,
  createResource,
} from "../lib/resources";
import { AppLayout } from "../components/AppLayout";
import { ResourceCardSkeleton } from "../components/ResourceCardSkeleton";
import type { Resource } from "../types";
import { useAuth } from "../context/AuthContext";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-danger/15 text-danger",
  editor: "bg-warning/15 text-warning",
  viewer: "bg-neutral/15 text-neutral",
};

const ResourcesPage = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "all">("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [requiredRoleName, setRequiredRoleName] = useState("viewer");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data =
          scope === "all"
            ? await fetchAllResources()
            : await fetchMyResources();
        setResources(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [scope]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const resource = await createResource(name, requiredRoleName);
      setResources((prev) =>
        scope === "mine" || scope === "all" ? [resource, ...prev] : prev,
      );
      setName("");
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(
        err.response?.data?.message || "Failed to create resource",
      );
    } finally {
      setCreating(false);
    }
  };

  const filteredResources = resources.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppLayout>
      <div className="">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-mono font-semibold text-on-dark tracking-tight">
              RESOURCE_DIRECTORY
            </h1>
            <p className="mt-1 text-sm text-on-dark-muted">
              Browse and request access to platform resources.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter resources..."
              className="rounded-md border border-border-dark bg-surface-raised px-3.5 py-2 text-sm text-on-dark font-mono placeholder:text-on-dark-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button
              onClick={() => setShowCreate((prev) => !prev)}
              className="flex items-center gap-2 font-mono uppercase rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition shrink-0"
            >
              New
            </button>
          </div>
        </div>

        <div className="mt-4 flex rounded-md border border-border-dark overflow-hidden w-fit">
          <button
            onClick={() => setScope("all")}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wide transition ${
              scope === "all"
                ? "bg-brand text-white"
                : "bg-surface-raised text-on-dark-muted hover:text-on-dark"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setScope("mine")}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wide transition ${
              scope === "mine"
                ? "bg-brand text-white"
                : "bg-surface-raised text-on-dark-muted hover:text-on-dark"
            }`}
          >
            Mine
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mt-6 rounded-xl border border-border-dark bg-surface-raised p-6 flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Resource name"
              required
              autoFocus
              className="flex-1 rounded-md border border-border-dark bg-bg px-3.5 py-2.5 text-sm text-on-dark font-mono placeholder:text-on-dark-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <select
              value={requiredRoleName}
              onChange={(e) => setRequiredRoleName(e.target.value)}
              className="rounded-md border border-border-dark bg-bg px-3.5 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 transition"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        )}
        {createError && (
          <p className="mt-2 text-xs text-danger font-mono">{createError}</p>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <>
              <ResourceCardSkeleton />
              <ResourceCardSkeleton />
              <ResourceCardSkeleton />
            </>
          ) : filteredResources.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-on-dark-muted">
              {search ? "No resources match your search." : "No resources yet."}
            </p>
          ) : (
            filteredResources.map((resource) => {
              const roleKey = resource.requiredRole.name.toLowerCase();

              return (
                <div
                  key={resource.id}
                  className="rounded-xl border border-border-dark bg-surface-raised p-5 hover:border-brand transition"
                >
                  <div className="flex items-center justify-between">
                    <Database className="w-5 h-5 text-brand" />
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                        ROLE_BADGE_STYLES[roleKey] ??
                        "bg-neutral/15 text-neutral"
                      }`}
                    >
                      {resource.requiredRole.name}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-semibold text-on-dark">
                    {resource.name}
                  </p>
                  <p className="mt-1 text-xs text-on-dark-muted">
                    Requires: {resource.requiredRole.name}
                  </p>

                  <div className="mt-4 pt-4 border-t border-border-dark flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-on-dark-muted">
                        Owner
                      </p>
                      <p className="text-xs text-on-dark">
                        {resource.owner.username}
                      </p>
                    </div>
                    <Link
                      to={`/resources/${resource.id}`}
                      className="rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-brand/15 text-brand hover:bg-brand/25 transition"
                    >
                      {resource.ownerId === user?.id ? "Manage" : "Request"}
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ResourcesPage;
