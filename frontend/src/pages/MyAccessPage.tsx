import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Key } from "lucide-react";
import { fetchMyGrants, surrenderGrant } from "../lib/resources";
import { AppLayout } from "../components/AppLayout";
import { SkeletonRow } from "../components/SkeletonRow";
import type { Grant } from "../types";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-danger/15 text-danger",
  editor: "bg-warning/15 text-warning",
  viewer: "bg-neutral/15 text-neutral",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success",
  EXPIRED: "bg-neutral/15 text-neutral",
  REVOKED: "bg-danger/15 text-danger",
  SURRENDERED: "bg-neutral/15 text-neutral",
};

const expiresLabel = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
};

const isUnused = (grant: Grant) => {
  if (grant.status !== "ACTIVE") return false;
  const referenceDate = grant.lastAccessedAt ?? grant.grantedAt;
  const daysSince =
    (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 3;
};

const MyAccessPage = () => {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyGrants()
      .then(setGrants)
      .finally(() => setLoading(false));
  }, []);

  const handleSurrender = async (grantId: string) => {
    if (confirmingId !== grantId) {
      setConfirmingId(grantId);
      return;
    }

    setError("");
    setActingId(grantId);
    try {
      await surrenderGrant(grantId);
      setGrants((prev) =>
        prev.map((g) =>
          g.id === grantId ? { ...g, status: "SURRENDERED" } : g,
        ),
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to surrender access");
    } finally {
      setActingId(null);
      setConfirmingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="">
        <h1 className="text-2xl font-mono font-semibold text-on-dark tracking-tight">
          MY_ACCESS
        </h1>
        <p className="mt-1 text-sm text-on-dark-muted">
          Manage your current grants and group memberships.
        </p>

        {error && <p className="mt-3 text-xs text-danger font-mono">{error}</p>}

        <div className="mt-6 rounded-xl border border-border-dark bg-surface-raised overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border-dark">
            <Key className="w-4 h-4 text-on-dark-muted" />
            <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
              Active_Grants
            </p>
          </div>

          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : grants.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-on-dark-muted">
              You don't have any grants yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted border-b border-border-dark">
                    <th className="text-left font-medium px-5 py-3">Status</th>
                    <th className="text-left font-medium px-2 py-3">
                      Resource
                    </th>
                    <th className="text-left font-medium px-2 py-3">Role</th>
                    <th className="text-left font-medium px-2 py-3">Expires</th>
                    <th className="text-right font-medium px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((grant) => {
                    const roleKey = grant.role?.name.toLowerCase() ?? "viewer";
                    const unused = isUnused(grant);
                    const isConfirming = confirmingId === grant.id;
                    const isActing = actingId === grant.id;

                    return (
                      <tr
                        key={grant.id}
                        className="border-b border-border-dark last:border-0"
                      >
                        <td className="px-5 py-4 align-top whitespace-nowrap">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${STATUS_BADGE_STYLES[grant.status]}`}
                          >
                            {grant.status}
                          </span>
                        </td>
                        <td className="px-2 py-4 align-top">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <Link
                              to={`/resources/${grant.resourceId}`}
                              className="text-sm font-medium text-on-dark hover:text-brand transition"
                            >
                              {grant.resource?.name ?? "Unknown resource"}
                            </Link>
                            {unused && (
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide bg-warning/15 text-warning">
                                Unused &gt; 3d
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-4 align-top whitespace-nowrap">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${ROLE_BADGE_STYLES[roleKey]}`}
                          >
                            {grant.role?.name}
                          </span>
                        </td>
                        <td className="px-2 py-4 align-top text-on-dark-muted text-xs whitespace-nowrap">
                          {grant.status === "ACTIVE"
                            ? expiresLabel(grant.expiresAt)
                            : grant.status.toLowerCase()}
                        </td>
                        <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                          {grant.status === "ACTIVE" && (
                            <div className="flex items-center justify-end gap-2">
                              {isConfirming && !isActing && (
                                <button
                                  onClick={() => setConfirmingId(null)}
                                  className="text-[10px] font-mono uppercase tracking-wide text-on-dark-muted hover:text-on-dark transition"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                onClick={() => handleSurrender(grant.id)}
                                disabled={isActing}
                                className="rounded-md border border-danger/30 px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-danger hover:bg-danger/10 disabled:opacity-50 transition"
                              >
                                {isActing
                                  ? "..."
                                  : isConfirming
                                    ? "Confirm"
                                    : "Surrender"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default MyAccessPage;
