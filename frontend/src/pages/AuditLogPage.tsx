import { useState, useEffect, useMemo, Fragment } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { fetchMyAuditLog, fetchAllAuditLog } from "../lib/auditLog";
import { AppLayout } from "../components/AppLayout";
import { SkeletonRow } from "../components/SkeletonRow";
import { useAuth } from "../context/AuthContext";
import type { AuditLogEntry } from "../types";

const ACTION_LABELS: Record<string, string> = {
  REQUEST_PENDING_APPROVAL: "REQUEST",
  REQUEST_APPROVED: "APPROVE",
  REQUEST_AUTO_APPROVED: "AUTO-APPROVE",
  REQUEST_DENIED: "DENY",
  GRANT_REVOKED: "REVOKE",
  GRANT_EXPIRED: "EXPIRE",
  GROUP_MEMBERSHIP_EXPIRED: "EXPIRE",
  GRANT_FLAGGED_UNUSED: "FLAG",
  UNAUTHORIZED_ACCESS_ATTEMPT: "DENY",
  GRANT_SUPERSEDED: "SUPERSEDE",
  GRANT_SURRENDERED: "SURRENDER",
  OWNER_ACCESS_REQUEST_AUTO_APPROVED: "LOG",
  ACCESS_ATTEMPT_DENIED: "DENY",
  GROUP_OWNERSHIP_TRANSFERRED: "TRANSFER",
};

const ALL_ACTION_OPTIONS = Array.from(
  new Set(Object.values(ACTION_LABELS)),
).sort();

const ACTION_COLORS: Record<string, string> = {
  REQUEST: "text-brand",
  APPROVE: "text-success",
  "AUTO-APPROVE": "text-success",
  DENY: "text-danger",
  REVOKE: "text-danger",
  EXPIRE: "text-neutral",
  FLAG: "text-warning",
  SUPERSEDE: "text-warning",
  SURRENDER: "text-neutral",
  LOG: "text-neutral",
  TRANSFER: "text-brand",
};

const detailFor = (entry: AuditLogEntry) => {
  const d = entry.detail as Record<string, any> | null;
  switch (entry.action) {
    case "REQUEST_PENDING_APPROVAL":
      return `Requested access to ${entry.resource?.name ?? "a resource"}`;
    case "REQUEST_APPROVED":
      return `Approved request for ${d?.requesterUsername ?? "a user"}`;
    case "REQUEST_AUTO_APPROVED":
      return `Auto-approved ${d?.requestedRoleName ?? ""} access to ${entry.resource?.name ?? "a resource"} by policy`;
    case "REQUEST_DENIED":
      return `Denied request for ${d?.requesterUsername ?? "a user"}`;
    case "GRANT_REVOKED": {
      if (d?.subjectType === "GROUP") {
        return `Revoked ${d?.role ?? ""} access from group "${d?.groupName ?? "a group"}"`;
      }
      const isSelf =
        d?.subjectUsername && d.subjectUsername === entry.actor.username;
      return isSelf
        ? `Revoked their own ${d?.role ?? ""} access`
        : `Revoked ${d?.role ?? ""} access from ${d?.subjectUsername ?? "a user"}`;
    }
    case "GRANT_EXPIRED":
      return `Grant expired on ${entry.resource?.name ?? "a resource"}`;
    case "GROUP_MEMBERSHIP_EXPIRED":
      return "Group membership expired";
    case "GRANT_FLAGGED_UNUSED":
      return `Flagged unused on ${entry.resource?.name ?? "a resource"}`;
    case "UNAUTHORIZED_ACCESS_ATTEMPT":
    case "ACCESS_ATTEMPT_DENIED":
      return `Denied access to ${entry.resource?.name ?? "a resource"}`;
    case "GRANT_SUPERSEDED":
      return `${d?.revokedRole ?? "Lower"} grant superseded by ${d?.newRole ?? "a higher role"}`;
    case "GRANT_SURRENDERED":
      return d?.subjectType === "GROUP"
        ? `Surrendered ${d?.role ?? ""} access on behalf of group`
        : `Surrendered ${d?.role ?? ""} access`;
    case "OWNER_ACCESS_REQUEST_AUTO_APPROVED":
      return `Logged ${d?.requestedRoleName ?? ""} session on ${entry.resource?.name ?? "own resource"}`;
    case "GROUP_OWNERSHIP_TRANSFERRED":
      return `Transferred ownership of "${d?.groupName ?? "a group"}" from ${d?.previousOwnerUsername ?? "a user"} to ${d?.newOwnerUsername ?? "a user"}`;
    default:
      return entry.action.toLowerCase().replace(/_/g, " ");
  }
};

const DETAIL_KEY_LABELS: Record<string, string> = {
  role: "Role",
  newRole: "New Role",
  revokedRole: "Revoked Role",
  subjectType: "Subject Type",
  subjectUsername: "User",
  groupName: "Group",
  requesterUsername: "Requester",
  requestedRoleName: "Requested Role",
  durationMinutes: "Duration (min)",
  revokedByRole: "Revoked By",
  newOwnerUsername: "New Owner",
  previousOwnerUsername: "Previous Owner",
};

const HIDDEN_DETAIL_KEYS = new Set([
  "grantId",
  "requestId",
  "revokedGrantId",
  "newGrantId",
  "subjectUserId",
  "groupId",
  "requesterId",
  "requestedRoleId",
  "onBehalfOfGroupId",
  "policyRuleId",
  "newOwnerId",
  "previousOwnerId",
]);

const DEBOUNCE_MS = 350;
const PAGE_SIZE = 20;

const AuditLogPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [actorFilter, setActorFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [debouncedActor, setDebouncedActor] = useState("");
  const [debouncedResource, setDebouncedResource] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedActor(actorFilter), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [actorFilter]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedResource(resourceFilter),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [resourceFilter]);

  useEffect(() => {
    setPage(1);
  }, [scope, debouncedActor, debouncedResource, actionFilter]);

  const actionsForLabel = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [raw, label] of Object.entries(ACTION_LABELS)) {
      map[label] = [...(map[label] ?? []), raw];
    }
    return map;
  }, []);

  const singleRawAction =
    actionFilter !== "all" && actionsForLabel[actionFilter]?.length === 1
      ? actionsForLabel[actionFilter][0]
      : undefined;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setExpandedId(null);
      try {
        const params = {
          page,
          resourceName: debouncedResource || undefined,
          actorName: debouncedActor || undefined,
          action: singleRawAction,
        };

        const data =
          scope === "all"
            ? await fetchAllAuditLog(params)
            : await fetchMyAuditLog(params);
        setEntries(data.entries);
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [scope, debouncedActor, debouncedResource, page, singleRawAction]);

  const filteredEntries = entries.filter((e) => {
    if (actionFilter === "all" || singleRawAction) return true;
    const rawActions = actionsForLabel[actionFilter] ?? [];
    return rawActions.includes(e.action);
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppLayout>
      <div className="max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-mono font-semibold text-on-dark tracking-tight">
              AUDIT_LEDGER
            </h1>
            <p className="mt-1 text-sm text-on-dark-muted">
              Immutable record of access control events.
            </p>
          </div>

          {user?.role === "ADMIN" && (
            <div className="flex rounded-md border border-border-dark overflow-hidden w-fit">
              <button
                onClick={() => setScope("mine")}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wide cursor-pointer transition ${
                  scope === "mine"
                    ? "bg-brand text-white"
                    : "bg-surface-raised text-on-dark-muted hover:text-on-dark"
                }`}
              >
                Mine
              </button>
              <button
                onClick={() => setScope("all")}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wide cursor-pointer transition ${
                  scope === "all"
                    ? "bg-brand text-white"
                    : "bg-surface-raised text-on-dark-muted hover:text-on-dark"
                }`}
              >
                All
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="Filter actor..."
            className="flex-1 rounded-md border border-border-dark bg-surface-raised px-3.5 py-2.5 text-sm text-on-dark font-mono placeholder:text-on-dark-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <input
            type="text"
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            placeholder="Filter resource..."
            className="flex-1 rounded-md border border-border-dark bg-surface-raised px-3.5 py-2.5 text-sm text-on-dark font-mono placeholder:text-on-dark-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="appearance-none rounded-md border border-border-dark bg-surface-raised pl-3.5 pr-8 py-2.5 text-sm text-on-dark font-mono cursor-pointer outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="all">All Actions</option>
              {ALL_ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-dark-muted" />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border-dark bg-surface-raised overflow-hidden">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : filteredEntries.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-on-dark-muted">
              No matching events.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted border-b border-border-dark">
                    <th className="text-left font-medium px-5 py-3 w-8" />
                    <th className="text-left font-medium px-2 py-3">
                      Timestamp
                    </th>
                    <th className="text-left font-medium px-2 py-3">Actor</th>
                    <th className="text-left font-medium px-2 py-3">Action</th>
                    <th className="text-left font-medium px-2 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const label = ACTION_LABELS[entry.action] ?? entry.action;
                    const isExpanded = expandedId === entry.id;
                    const detailObj =
                      (entry.detail as Record<string, any>) ?? {};
                    const detailKeys = Object.keys(detailObj).filter(
                      (k) =>
                        detailObj[k] !== undefined &&
                        detailObj[k] !== null &&
                        !HIDDEN_DETAIL_KEYS.has(k),
                    );
                    const hasResource = Boolean(entry.resource?.name);
                    const hasAnyDetail = hasResource || detailKeys.length > 0;

                    return (
                      <Fragment key={entry.id}>
                        <tr
                          onClick={() =>
                            setExpandedId(isExpanded ? null : entry.id)
                          }
                          className="border-b border-border-dark last:border-0 cursor-pointer hover:bg-white/5 transition"
                        >
                          <td className="px-5 py-3">
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-on-dark-muted" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-on-dark-muted" />
                            )}
                          </td>
                          <td className="px-2 py-3 text-on-dark-muted font-mono text-xs whitespace-nowrap">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                          <td className="px-2 py-3 text-on-dark font-medium whitespace-nowrap">
                            {entry.actor.username}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <span
                              className={`font-mono text-xs font-semibold uppercase ${ACTION_COLORS[label] ?? "text-on-dark-muted"}`}
                            >
                              {label}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-on-dark-muted">
                            {detailFor(entry)}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-black/20 border-b border-border-dark last:border-0">
                            <td colSpan={5} className="px-5 py-4">
                              {!hasAnyDetail ? (
                                <p className="text-xs text-on-dark-muted font-mono">
                                  No additional detail recorded.
                                </p>
                              ) : (
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                                  {hasResource && (
                                    <div className="flex justify-between sm:justify-start sm:gap-3">
                                      <dt className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted">
                                        Resource
                                      </dt>
                                      <dd className="text-xs font-mono text-on-dark break-all">
                                        {entry.resource!.name}
                                      </dd>
                                    </div>
                                  )}
                                  {detailKeys.map((key) => (
                                    <div
                                      key={key}
                                      className="flex justify-between sm:justify-start sm:gap-3"
                                    >
                                      <dt className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted">
                                        {DETAIL_KEY_LABELS[key] ?? key}
                                      </dt>
                                      <dd className="text-xs font-mono text-on-dark break-all">
                                        {String(detailObj[key])}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredEntries.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border-dark">
              <p className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-md border border-border-dark px-2.5 py-1.5 text-xs font-mono uppercase tracking-wide text-on-dark-muted cursor-pointer hover:text-on-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-md border border-border-dark px-2.5 py-1.5 text-xs font-mono uppercase tracking-wide text-on-dark-muted cursor-pointer hover:text-on-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AuditLogPage;
