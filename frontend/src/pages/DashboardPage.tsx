import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchMyResources } from "../lib/resources";
import { fetchPendingForOwner } from "../lib/requests";
import { AppLayout } from "../components/AppLayout";
import { SkeletonCard } from "../components/SkeletonCard";
import { SkeletonRow } from "../components/SkeletonRow";
import { useAuth } from "../context/AuthContext";
import type { Resource, AccessRequest } from "../types";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-danger-bg text-danger",
  editor: "bg-warning-bg text-warning",
  viewer: "bg-neutral-bg text-neutral",
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [resourcesData, pendingData] = await Promise.all([
          fetchMyResources(),
          fetchPendingForOwner(),
        ]);
        setResources(resourcesData);
        setPendingRequests(pendingData);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const flaggedUnused = resources.filter((r) => (r as any).unused).length;

  const sortedPendingRequests = [...pendingRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const sortedResources = [...resources].sort((a, b) => {
    const aDate = (a as any).createdAt;
    const bDate = (b as any).createdAt;
    if (!aDate || !bDate) return 0;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return (
    <AppLayout>
      <div className="">
        <h1 className="text-2xl font-mono font-semibold text-on-dark tracking-tight">
          SYSTEM_OVERVIEW
        </h1>
        <p className="mt-1 text-sm text-on-dark-muted">
          Welcome back, {user?.username ?? "user"}.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <div className="rounded-xl border border-border-dark bg-surface-raised p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
                    Pending Approvals
                  </p>
                  <span className="text-warning">◷</span>
                </div>
                <p className="mt-3 text-3xl font-semibold text-on-dark font-mono">
                  {pendingRequests.length}
                </p>
                <Link
                  to="/approvals"
                  className="mt-2 inline-block text-xs font-medium text-brand hover:text-brand-hover"
                >
                  Review requests →
                </Link>
              </div>

              <div className="rounded-xl border border-border-dark bg-surface-raised p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
                    Active Grants
                  </p>
                  <span className="text-brand">⚿</span>
                </div>
                <p className="mt-3 text-3xl font-semibold text-on-dark font-mono">
                  {resources.length}
                </p>
                <Link
                  to="/resources"
                  className="mt-2 inline-block text-xs font-medium text-brand hover:text-brand-hover"
                >
                  View my access →
                </Link>
              </div>

              <div className="rounded-xl border border-border-dark bg-surface-raised p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
                    Flagged Unused
                  </p>
                  <span className="text-danger">⚠</span>
                </div>
                <p className="mt-3 text-3xl font-semibold text-on-dark font-mono">
                  {flaggedUnused}
                </p>
                <p className="mt-2 text-xs text-on-dark-muted">
                  {flaggedUnused} resource{flaggedUnused === 1 ? "" : "s"}{" "}
                  unused
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="rounded-xl border border-border-dark bg-surface-raised">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
              <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
                Recent Activity
              </p>
              <Link
                to="/audit-log"
                className="text-xs font-medium text-brand hover:text-brand-hover"
              >
                View All
              </Link>
            </div>
            <div>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : sortedPendingRequests.length === 0 ? (
                <p className="px-5 py-6 text-sm text-center text-on-dark-muted">
                  No recent activity.
                </p>
              ) : (
                sortedPendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="px-5 py-4 border-b border-border-dark last:border-0"
                  >
                    <p className="text-sm text-on-dark">
                      <span className="font-medium">
                        {req.requester?.username}
                      </span>{" "}
                      requested access to{" "}
                      <span className="rounded bg-bg px-1.5 py-0.5 text-xs font-mono text-on-dark-muted">
                        {req.resource?.name}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-on-dark-muted font-mono">
                      {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border-dark bg-surface-raised">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
              <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
                My Resources
              </p>
              <Link
                to="/resources"
                className="text-xs font-medium text-brand hover:text-brand-hover"
              >
                View All
              </Link>
            </div>
            <div>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : sortedResources.length === 0 ? (
                <p className="px-5 py-6 text-sm text-center text-on-dark-muted">
                  No resources yet.
                </p>
              ) : (
                sortedResources.map((resource) => {
                  const roleKey = resource.requiredRole.name.toLowerCase();
                  return (
                    <Link
                      key={resource.id}
                      to={`/resources/${resource.id}`}
                      className="flex items-center justify-between px-5 py-4 border-b border-border-dark last:border-0 hover:bg-bg transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-on-dark">
                            {resource.name}
                          </p>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                              ROLE_BADGE_STYLES[roleKey] ??
                              "bg-neutral-bg text-neutral"
                            }`}
                          >
                            {resource.requiredRole.name}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-on-dark-muted">
                          requires: {resource.requiredRole.name}
                        </p>
                      </div>
                      <span className="text-on-dark-muted">›</span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
