import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchMyResources } from "../lib/resources";
import { fetchPendingForOwner } from "../lib/requests";
import { fetchMyAuditLog, fetchAllAuditLog } from "../lib/auditLog";
import { AppLayout } from "../components/AppLayout";
import { SkeletonCard } from "../components/SkeletonCard";
import { SkeletonRow } from "../components/SkeletonRow";
import { SummaryCard } from "../components/SummaryCard";
import { useAuth } from "../context/AuthContext";
import type { Resource, AccessRequest, AuditLogEntry } from "../types";
import { CheckCircle, Key, TriangleAlert } from "lucide-react";
import { timeAgo } from "../lib/timeAgo";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-danger/15 text-danger",
  editor: "bg-warning/15 text-warning",
  viewer: "bg-neutral/15 text-neutral",
};

type ActivityPart = { text: string; emphasize?: boolean };

const ACTION_TEMPLATES: Record<
  string,
  (entry: AuditLogEntry) => ActivityPart[]
> = {
  REQUEST_PENDING_APPROVAL: (e) => [
    { text: `${e.actor?.username} requested access to ` },
    { text: e.resource?.name ?? "a resource", emphasize: true },
  ],
  GRANT_EXPIRED: (e) => [
    { text: `${e.actor?.username}'s access to ` },
    { text: e.resource?.name ?? "a resource", emphasize: true },
    { text: " expired" },
  ],
  GROUP_MEMBERSHIP_EXPIRED: (e) => [
    { text: `${e.actor?.username}'s group membership expired` },
  ],
  GRANT_FLAGGED_UNUSED: (e) => [
    { text: "Access to " },
    { text: e.resource?.name ?? "a resource", emphasize: true },
    { text: " was flagged as unused" },
  ],
  UNAUTHORIZED_ACCESS_ATTEMPT: (e) => [
    { text: `${e.actor?.username} was denied access to ` },
    { text: e.resource?.name ?? "a resource", emphasize: true },
  ],
};

const formatActivity = (entry: AuditLogEntry): ActivityPart[] => {
  const template = ACTION_TEMPLATES[entry.action];
  if (template) return template(entry);
  return [
    {
      text: `${entry.actor?.username} — ${entry.action.toLowerCase().replace(/_/g, " ")}`,
    },
  ];
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const activityPromise =
          user?.role === "ADMIN" ? fetchAllAuditLog(5) : fetchMyAuditLog(5);

        const [resourcesData, pendingData, activityData] = await Promise.all([
          fetchMyResources(),
          fetchPendingForOwner(),
          activityPromise,
        ]);
        setResources(resourcesData);
        setPendingRequests(pendingData);
        setActivity(activityData);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.role]);

  const flaggedUnused = resources.filter((r) => (r as any).unused).length;

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
              <SummaryCard
                label="Pending Approvals"
                value={pendingRequests.length}
                accent="warning"
                icon={<CheckCircle className="w-4 h-4" />}
                linkTo="/approvals"
                linkLabel="Review requests →"
              />

              <SummaryCard
                label="Active Grants"
                value={resources.length}
                accent="brand"
                icon={<Key className="w-4 h-4" />}
                linkTo="/resources"
                linkLabel="View my access →"
              />

              <SummaryCard
                label="Flagged Unused"
                value={flaggedUnused}
                accent="danger"
                icon={<TriangleAlert className="w-4 h-4" />}
                description={`${flaggedUnused} resource${flaggedUnused === 1 ? "" : "s"} unused`}
              />
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="rounded-xl border border-border-dark bg-surface-raised">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
              <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
                {user?.role === "ADMIN"
                  ? "Platform Activity"
                  : "Recent Activity"}
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
              ) : activity.length === 0 ? (
                <p className="px-5 py-6 text-sm text-center text-on-dark-muted">
                  No recent activity.
                </p>
              ) : (
                activity.map((entry) => (
                  <div
                    key={entry.id}
                    className="px-5 py-4 border-b border-border-dark last:border-0"
                  >
                    <p className="text-sm text-on-dark">
                      {formatActivity(entry).map((part, i) =>
                        part.emphasize ? (
                          <span
                            key={i}
                            className="rounded bg-bg px-1.5 py-0.5 text-xs font-mono text-on-dark-muted"
                          >
                            {part.text}
                          </span>
                        ) : (
                          <span key={i}>{part.text}</span>
                        ),
                      )}
                    </p>
                    <p className="mt-1 text-xs text-on-dark-muted font-mono">
                      {timeAgo(entry.createdAt)}
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
                      className="group flex items-center justify-between px-5 py-4 border-b border-border-dark last:border-0 hover:bg-bg transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-on-dark">
                            {resource.name}
                          </p>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                              ROLE_BADGE_STYLES[roleKey] ??
                              "bg-neutral/15 text-neutral"
                            }`}
                          >
                            {resource.requiredRole.name}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-on-dark-muted">
                          requires: {resource.requiredRole.name}
                        </p>
                      </div>
                      <span className="text-on-dark-muted transition-transform group-hover:translate-x-1 group-hover:text-brand">
                        ›
                      </span>
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
