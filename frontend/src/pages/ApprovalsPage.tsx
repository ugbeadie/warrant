import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import {
  fetchPendingForOwner,
  fetchAllPending,
  decideRequest,
} from "../lib/requests";
import { AppLayout } from "../components/AppLayout";
import { SkeletonRow } from "../components/SkeletonRow";
import { useAuth } from "../context/AuthContext";
import type { AccessRequest } from "../types";
import { timeAgo } from "../lib/timeAgo";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-danger/15 text-danger",
  editor: "bg-warning/15 text-warning",
  viewer: "bg-neutral/15 text-neutral",
};

const durationLabel = (minutes: number) => {
  const pluralize = (value: number, unit: string) =>
    `${value} ${unit}${value === 1 ? "" : "s"}`;

  if (minutes < 60) return pluralize(minutes, "minute");
  if (minutes < 1440) return pluralize(Math.round(minutes / 60), "hour");
  if (minutes < 10080) return pluralize(Math.round(minutes / 1440), "day");
  return pluralize(Math.round(minutes / 10080), "week");
};

const ApprovalsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data =
          scope === "all"
            ? await fetchAllPending()
            : await fetchPendingForOwner();
        setRequests(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [scope]);

  const handleDecision = async (
    requestId: string,
    decision: "APPROVED" | "DENIED",
  ) => {
    setError("");
    setDecidingId(requestId);
    try {
      await decideRequest(requestId, decision);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record decision");
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-mono font-semibold text-on-dark tracking-tight">
              APPROVALS_QUEUE
            </h1>
            <p className="mt-1 text-sm text-on-dark-muted">
              Requests awaiting your authorization.
            </p>
          </div>

          {user?.role === "ADMIN" && (
            <div className="flex rounded-md border border-border-dark overflow-hidden w-fit">
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
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-danger font-mono">{error}</p>}

        <div className="mt-6 rounded-xl border border-border-dark bg-surface-raised overflow-hidden">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : requests.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-on-dark-muted">
              No pending requests.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted border-b border-border-dark">
                  <th className="text-left font-medium px-5 py-3">Requester</th>
                  <th className="text-left font-medium px-2 py-3">Resource</th>
                  <th className="text-left font-medium px-2 py-3">Reason</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const roleKey = req.requestedRole.name.toLowerCase();
                  const isActing = decidingId === req.id;

                  return (
                    <tr
                      key={req.id}
                      className="border-b border-border-dark last:border-0"
                    >
                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-medium text-on-dark">
                          {req.requester.username}
                        </p>
                        <p className="mt-0.5 text-xs text-on-dark-muted font-mono">
                          {timeAgo(req.createdAt)}
                        </p>
                      </td>
                      <td className="px-2 py-4 align-top">
                        <Link
                          to={`/resources/${req.resource.id}`}
                          className="text-sm font-medium text-on-dark hover:text-brand transition"
                        >
                          {req.resource.name}
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                              ROLE_BADGE_STYLES[roleKey] ??
                              "bg-neutral/15 text-neutral"
                            }`}
                          >
                            {req.requestedRole.name}
                          </span>
                          <span className="text-xs text-on-dark-muted">
                            · {durationLabel(req.durationMinutes)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-4 align-top text-on-dark-muted max-w-xs">
                        {req.reason}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDecision(req.id, "DENIED")}
                            disabled={isActing}
                            className="flex items-center gap-1 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-danger hover:bg-danger/10 disabled:opacity-50 transition"
                          >
                            <X className="w-3 h-3" />
                            Deny
                          </button>
                          <button
                            onClick={() => handleDecision(req.id, "APPROVED")}
                            disabled={isActing}
                            className="flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-white hover:bg-brand-hover disabled:opacity-50 transition"
                          >
                            <Check className="w-3 h-3" />
                            {isActing ? "..." : "Approve"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ApprovalsPage;
