import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchMyResources, fetchMyGrants } from "../lib/resources";
import { fetchPendingForOwner } from "../lib/requests";
import { fetchMyAuditLog, fetchAllAuditLog } from "../lib/auditLog";
import { AppLayout } from "../components/AppLayout";
import { SkeletonCard } from "../components/SkeletonCard";
import { SkeletonRow } from "../components/SkeletonRow";
import { SummaryCard } from "../components/SummaryCard";
import { useAuth } from "../context/AuthContext";
import type { Resource, AccessRequest, AuditLogEntry, Grant } from "../types";
import { CheckCircle, Key, TriangleAlert } from "lucide-react";
import { timeAgo } from "../lib/timeAgo";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-danger/15 text-danger",
  editor: "bg-warning/15 text-warning",
  viewer: "bg-neutral/15 text-neutral",
};

const DASHBOARD_ACTIVITY_PREVIEW_COUNT = 5;

const isUnused = (grant: Grant) => {
  if (grant.status !== "ACTIVE") return false;
  const referenceDate = grant.lastAccessedAt ?? grant.grantedAt;
  const daysSince =
    (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 3;
};

type ActivityPart = { text: string; emphasize?: boolean };

const ACTION_TEMPLATES: Record<
  string,
  (entry: AuditLogEntry) => ActivityPart[]
> = {
  REQUEST_PENDING_APPROVAL: (e) => {
    const d = e.detail as Record<string, any> | null;
    return [
      {
        text: `${e.actor?.username} requested ${d?.requestedRoleName ?? ""} access to `,
      },
      { text: e.resource?.name ?? "a resource", emphasize: true },
    ];
  },

  REQUEST_APPROVED: (e) => {
    const d = e.detail as Record<string, any> | null;
    return [
      {
        text: `${e.actor?.username} approved ${d?.requesterUsername ?? "a"}'s request for `,
      },
      { text: e.resource?.name ?? "a resource", emphasize: true },
    ];
  },

  REQUEST_DENIED: (e) => {
    const d = e.detail as Record<string, any> | null;
    return [
      {
        text: `${e.actor?.username} denied ${d?.requesterUsername ?? "a"}'s request for `,
      },
      { text: e.resource?.name ?? "a resource", emphasize: true },
    ];
  },

  REQUEST_AUTO_APPROVED: (e) => {
    return [
      { text: `${e.actor?.username}'s request for ` },
      { text: e.resource?.name ?? "a resource", emphasize: true },
      { text: " was auto-approved by policy" },
    ];
  },

  GRANT_REVOKED: (e) => {
    const d = e.detail as Record<string, any> | null;
    if (d?.subjectType === "GROUP") {
      return [
        {
          text: `${e.actor?.username} revoked group "${d?.groupName ?? "a group"}"'s access to `,
        },
        { text: e.resource?.name ?? "a resource", emphasize: true },
      ];
    }
    const isSelf =
      d?.subjectUsername && d.subjectUsername === e.actor?.username;
    return isSelf
      ? [
          { text: `${e.actor?.username} revoked their own access to ` },
          { text: e.resource?.name ?? "a resource", emphasize: true },
        ]
      : [
          {
            text: `${e.actor?.username} revoked ${d?.subjectUsername ?? "a user"}'s access to `,
          },
          { text: e.resource?.name ?? "a resource", emphasize: true },
        ];
  },

  GRANT_SURRENDERED: (e) => {
    const d = e.detail as Record<string, any> | null;
    return [
      { text: `${e.actor?.username} surrendered ${d?.role ?? ""} access to ` },
      { text: e.resource?.name ?? "a resource", emphasize: true },
    ];
  },

  GRANT_SUPERSEDED: (e) => {
    const d = e.detail as Record<string, any> | null;
    return [
      { text: `${e.actor?.username}'s ${d?.revokedRole ?? "lower"} grant on ` },
      { text: e.resource?.name ?? "a resource", emphasize: true },
      { text: ` was superseded by ${d?.newRole ?? "a higher role"}` },
    ];
  },

  GRANT_EXPIRED: (e) => {
    return [
      { text: `${e.actor?.username}'s access to ` },
      { text: e.resource?.name ?? "a resource", emphasize: true },
      { text: " expired" },
    ];
  },

  GROUP_MEMBERSHIP_EXPIRED: (e) => {
    return [{ text: `${e.actor?.username}'s group membership expired` }];
  },

  GRANT_FLAGGED_UNUSED: (e) => {
    return [
      { text: "Access to " },
      { text: e.resource?.name ?? "a resource", emphasize: true },
      { text: " was flagged as unused" },
    ];
  },

  UNAUTHORIZED_ACCESS_ATTEMPT: (e) => {
    return [
      { text: `${e.actor?.username} was denied access to ` },
      { text: e.resource?.name ?? "a resource", emphasize: true },
    ];
  },

  OWNER_ACCESS_REQUEST_AUTO_APPROVED: (e) => {
    const d = e.detail as Record<string, any> | null;
    return [
      { text: `${e.actor?.username} used their own access to ` },
      { text: e.resource?.name ?? "a resource", emphasize: true },
      { text: ` as ${d?.requestedRoleName ?? "owner"}` },
    ];
  },

  GROUP_OWNERSHIP_TRANSFERRED: (e) => {
    const d = e.detail as Record<string, any> | null;
    return [
      { text: `${e.actor?.username} transferred ownership of ` },
      { text: d?.groupName ?? "a group", emphasize: true },
      { text: ` to ${d?.newOwnerUsername ?? "a user"}` },
    ];
  },
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
  const [grants, setGrants] = useState<Grant[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const activityPromise =
          user?.role === "ADMIN"
            ? fetchAllAuditLog({ page: 1 })
            : fetchMyAuditLog({ page: 1 });

        const [resourcesData, grantsData, pendingData, activityData] =
          await Promise.all([
            fetchMyResources(),
            fetchMyGrants(),
            fetchPendingForOwner(),
            activityPromise,
          ]);
        setResources(resourcesData);
        setGrants(grantsData);
        setPendingRequests(pendingData);
        setActivity(
          activityData.entries.slice(0, DASHBOARD_ACTIVITY_PREVIEW_COUNT),
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.role]);

  const activeGrants = grants.filter((g) => g.status === "ACTIVE");
  const flaggedUnusedCount = activeGrants.filter(isUnused).length;

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
                value={activeGrants.length}
                accent="brand"
                icon={<Key className="w-4 h-4" />}
                linkTo="/my-access"
                linkLabel="View my access →"
              />

              <SummaryCard
                label="Flagged Unused"
                value={flaggedUnusedCount}
                accent="danger"
                icon={<TriangleAlert className="w-4 h-4" />}
                linkTo="/my-access"
                linkLabel="Review unused access →"
                // description={`${flaggedUnusedCount} grant${flaggedUnusedCount === 1 ? "" : "s"} unused 3+ days`}
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
