import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  fetchResourceById,
  checkResourceAccess,
  fetchGrantsForResource,
  revokeGrant as revokeGrantApi,
  deleteResource,
  deleteGrant,
} from "../lib/resources";
import { fetchMyRequestForResource } from "../lib/requests";
import { MAX_ROLE_RANK } from "../lib/roles";
import { AppLayout } from "../components/AppLayout";
import { ResourceDetailSkeleton } from "../components/ResourceDetailSkeleton";
import { RequestAccessModal } from "../components/RequestAccessModal";
import { EditResourceModal } from "../components/EditResourceModal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
import type {
  Resource,
  CheckAccessResult,
  Grant,
  AccessRequest,
} from "../types";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-danger/15 text-danger",
  editor: "bg-warning/15 text-warning",
  viewer: "bg-neutral/15 text-neutral",
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

const ResourceDetailPage = () => {
  console.log("ResourceDetailPage mounted/rendered");
  const { id } = useParams<{ id: string }>();
  const { user, sessionLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [resource, setResource] = useState<Resource | null>(null);
  const [access, setAccess] = useState<CheckAccessResult | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [myRequest, setMyRequest] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingAfterSubmit, setRefreshingAfterSubmit] = useState(false);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [actingGrantId, setActingGrantId] = useState<string | null>(null);
  const [actingAction, setActingAction] = useState<"revoke" | "delete" | null>(
    null,
  );

  const isOwner = resource ? resource.ownerId === user?.id : false;

  const isOwnerOrAdmin = resource
    ? resource.ownerId === user?.id || user?.role === "ADMIN"
    : false;

  const refreshGrants = useCallback(async () => {
    if (!id) return;
    const grantsData = await fetchGrantsForResource(id);
    setGrants(grantsData);
  }, [id]);

  const refreshAccess = useCallback(async () => {
    if (!id) return;
    const accessResult = await checkResourceAccess(id);
    setAccess(accessResult);
  }, [id]);

  useEffect(() => {
    if (!id || sessionLoading) return;

    const load = async () => {
      setLoading(true);
      try {
        const resourceData = await fetchResourceById(id);
        setResource(resourceData);

        const isTrueOwner = resourceData.ownerId === user?.id;
        const isAdminOverride = user?.role === "ADMIN";

        const [accessResult, grantsData, request] = await Promise.all([
          checkResourceAccess(id),
          isTrueOwner || isAdminOverride
            ? fetchGrantsForResource(id)
            : Promise.resolve(null),
          !isTrueOwner
            ? fetchMyRequestForResource(id).catch(() => null)
            : Promise.resolve(null),
        ]);

        setAccess(accessResult);
        if (isTrueOwner || isAdminOverride) setGrants(grantsData ?? []);
        setMyRequest(isTrueOwner ? null : request);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, user?.id, user?.role]);

  const handleRevoke = async (grantId: string) => {
    setActingGrantId(grantId);
    setActingAction("revoke");
    try {
      await revokeGrantApi(grantId);
      setGrants((prev) =>
        prev.map((g) => (g.id === grantId ? { ...g, status: "REVOKED" } : g)),
      );

      await refreshAccess();
      toast.success("Grant revoked");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revoke grant");
    } finally {
      setActingGrantId(null);
      setActingAction(null);
    }
  };

  const handleDeleteGrant = async (grantId: string) => {
    setActingGrantId(grantId);
    setActingAction("delete");
    try {
      await deleteGrant(grantId);
      setGrants((prev) => prev.filter((g) => g.id !== grantId));
      await refreshAccess();
      toast.success("Grant record deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete grant");
    } finally {
      setActingGrantId(null);
      setActingAction(null);
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    setDeleting(true);
    try {
      const deletedName = resource!.name;
      await deleteResource(resource!.id);
      toast.success(`Resource "${deletedName}" deleted`);
      navigate("/resources");
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.message || "Failed to delete resource",
      );
      setDeleting(false);
    }
  };

  const handleRequestAccessClick = () => {
    setShowRequestModal(true);
  };

  const handleRequestSubmitted = async (submittedGroupId: string | null) => {
    setShowRequestModal(false);
    setRefreshingAfterSubmit(true);
    toast.success(
      isOwner
        ? "Access session logged"
        : "Access request submitted for approval",
    );
    try {
      await Promise.all([
        refreshAccess(),
        isOwnerOrAdmin ? refreshGrants() : Promise.resolve(),
        isOwner
          ? Promise.resolve()
          : fetchMyRequestForResource(id!, submittedGroupId)
              .catch(() => null)
              .then(setMyRequest),
      ]);
    } finally {
      setRefreshingAfterSubmit(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <ResourceDetailSkeleton />
      </AppLayout>
    );
  }

  if (!resource) {
    return (
      <AppLayout>
        <p className="text-sm text-on-dark-muted">Resource not found.</p>
      </AppLayout>
    );
  }

  const roleKey = resource.requiredRole.name.toLowerCase();
  const isRequestPending = myRequest?.status === "PENDING";

  // Nothing higher left to request, so offering the action would only lead to a
  // modal that rejects every option.
  const atMaxRole = (access?.currentRole?.rank ?? 0) >= MAX_ROLE_RANK;

  return (
    <AppLayout>
      <div className="">
        <div className="flex items-center gap-1 text-xs font-mono text-on-dark-muted">
          <Link to="/resources" className="hover:text-on-dark transition">
            RESOURCES
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-on-dark">{resource.id.slice(0, 6)}</span>
        </div>

        <div className="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-mono font-semibold text-on-dark tracking-tight">
                {resource.name}
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                  ROLE_BADGE_STYLES[roleKey] ?? "bg-neutral/15 text-neutral"
                }`}
              >
                {resource.requiredRole.name}
              </span>
              {isOwner && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide bg-warning/15 text-warning">
                  Owner
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-on-dark-muted">
              Requires: {resource.requiredRole.name} access or higher
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isOwner && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 rounded-md border border-border-dark px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-on-dark cursor-pointer hover:bg-bg transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setShowConfirmDeleteModal(true)}
                  className="flex items-center gap-1.5 rounded-md border border-danger/30 px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-danger cursor-pointer hover:bg-danger/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}

            {refreshingAfterSubmit ? (
              <span className="flex items-center gap-2 rounded-md border border-border-dark bg-surface-raised px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-on-dark-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating...
              </span>
            ) : access?.hasAccess ? (
              <>
                <span className="rounded-md border border-success/30 bg-success/10 px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-success">
                  Access Granted
                </span>
                {isRequestPending ? (
                  <span className="rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-warning">
                    Pending Approval
                  </span>
                ) : atMaxRole ? null : (
                  <button
                    onClick={handleRequestAccessClick}
                    className="rounded-md border border-border-dark px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-on-dark cursor-pointer hover:bg-bg transition shrink-0"
                  >
                    {isOwner ? "Log_Access_Session" : "Request_Higher_Role"}
                  </button>
                )}
              </>
            ) : isOwner ? (
              <button
                onClick={handleRequestAccessClick}
                className="rounded-md bg-brand px-5 py-2.5 text-sm font-mono font-semibold uppercase tracking-wide text-white cursor-pointer hover:bg-brand-hover transition shrink-0"
              >
                Log_Access_Session
              </button>
            ) : isRequestPending ? (
              <span className="rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-warning">
                Pending Approval
              </span>
            ) : (
              <button
                onClick={handleRequestAccessClick}
                className="rounded-md bg-brand px-5 py-2.5 text-sm font-mono font-semibold uppercase tracking-wide text-white cursor-pointer hover:bg-brand-hover transition shrink-0"
              >
                Request_Access
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border-dark bg-surface-raised p-5">
              <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted mb-3">
                Access_Trace
              </p>
              {refreshingAfterSubmit ? (
                <div className="flex items-center gap-2.5 rounded-md border border-border-dark bg-bg px-3.5 py-3 text-sm text-on-dark-muted">
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  <span>Checking access...</span>
                </div>
              ) : (
                <div
                  className={`flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm ${
                    access?.hasAccess
                      ? "border-success/20 bg-success/10 text-success"
                      : access?.insufficient
                        ? "border-warning/20 bg-warning/10 text-warning"
                        : "border-border-dark bg-bg text-on-dark-muted"
                  }`}
                >
                  {access?.hasAccess ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : access?.insufficient ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {access?.reason ??
                      "You do not have access to this resource."}
                  </span>
                </div>
              )}
            </div>

            {isOwnerOrAdmin && (
              <div className="rounded-xl border border-border-dark bg-surface-raised">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
                  <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
                    Active_Grants
                  </p>
                  <span className="rounded-full bg-border-dark px-2 py-0.5 text-[10px] font-mono text-on-dark-muted">
                    {grants.length} Total
                  </span>
                </div>

                {grants.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-center text-on-dark-muted">
                    No grants yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-175 text-sm">
                      <thead>
                        <tr className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted">
                          <th className="text-left font-medium px-5 py-2">
                            User
                          </th>
                          <th className="text-left font-medium px-2 py-2">
                            Role
                          </th>
                          <th className="text-left font-medium px-2 py-2">
                            Expires
                          </th>
                          <th className="text-left font-medium px-2 py-2">
                            Justification
                          </th>
                          <th className="text-right font-medium px-5 py-2">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {grants.map((grant) => (
                          <tr
                            key={grant.id}
                            className="border-t border-border-dark"
                          >
                            <td className="px-5 py-3 text-on-dark whitespace-nowrap">
                              {grant.subjectType === "USER"
                                ? (grant.user?.username ?? "Unknown user")
                                : (grant.group?.name ?? "Unknown group")}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                                  ROLE_BADGE_STYLES[
                                    grant.role?.name.toLowerCase() ?? "viewer"
                                  ]
                                }`}
                              >
                                {grant.role?.name}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-on-dark-muted text-xs whitespace-nowrap">
                              {grant.status === "ACTIVE"
                                ? expiresLabel(grant.expiresAt)
                                : grant.status}
                            </td>
                            <td className="px-2 py-3 text-on-dark-muted text-xs">
                              <span
                                className="block max-w-55 truncate"
                                title={grant.request?.reason ?? undefined}
                              >
                                {grant.request?.reason ?? "—"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right whitespace-nowrap">
                              {grant.status === "ACTIVE" ? (
                                <button
                                  onClick={() => handleRevoke(grant.id)}
                                  disabled={actingGrantId === grant.id}
                                  className="text-xs font-mono uppercase text-danger cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actingGrantId === grant.id &&
                                  actingAction === "revoke"
                                    ? "Revoking..."
                                    : "Revoke"}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeleteGrant(grant.id)}
                                  disabled={actingGrantId === grant.id}
                                  className="text-xs font-mono uppercase text-on-dark-muted cursor-pointer hover:text-danger transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actingGrantId === grant.id &&
                                  actingAction === "delete"
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border-dark bg-surface-raised p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted mb-4">
              Metadata
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-mono uppercase text-on-dark-muted">
                  Resource ID
                </p>
                <p className="mt-1 text-sm font-mono text-on-dark">
                  {resource.id.slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-on-dark-muted">
                  Owner
                </p>
                <p className="mt-1 text-sm text-on-dark">
                  {resource.owner.username}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-on-dark-muted">
                  Required Role
                </p>
                <p className="mt-1 text-sm text-on-dark">
                  {resource.requiredRole.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-on-dark-muted">
                  Created
                </p>
                <p className="mt-1 text-sm text-on-dark">
                  {new Date(resource.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRequestModal && (
        <RequestAccessModal
          resource={resource}
          isOwner={isOwner}
          currentRole={access?.currentRole ?? null}
          onClose={() => setShowRequestModal(false)}
          onSubmitted={handleRequestSubmitted}
        />
      )}
      {showEditModal && resource && (
        <EditResourceModal
          resource={resource}
          onClose={() => setShowEditModal(false)}
          onUpdated={(updated) => {
            setResource(updated);
            toast.success(`Resource "${updated.name}" updated`);
          }}
        />
      )}
      {showConfirmDeleteModal && (
        <ConfirmDeleteModal
          title="Delete_Resource"
          message={
            deleteError
              ? deleteError
              : `Delete "${resource.name}"? This can't be undone.`
          }
          confirmLabel="Delete"
          danger
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirmDeleteModal(false)}
        />
      )}
    </AppLayout>
  );
};

export default ResourceDetailPage;
