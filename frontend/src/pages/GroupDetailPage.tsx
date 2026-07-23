import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Users, UserPlus, X, Search, Trash2 } from "lucide-react";
import {
  fetchGroupById,
  addGroupMember,
  removeGroupMember,
  deleteGroup,
} from "../lib/groups";
import { searchUsers, type UserSearchResult } from "../lib/users";
import { AppLayout } from "../components/AppLayout";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { useAuth } from "../context/AuthContext";
import type { Group } from "../types";
import { GroupDetailSkeleton } from "../components/GroupDetailSkeleton";

const DURATION_OPTIONS = [
  { label: "1 Day", minutes: 1440 },
  { label: "1 Week", minutes: 10080 },
  { label: "30 Days", minutes: 43200 },
  { label: "90 Days", minutes: 129600 },
];

const expiresLabel = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
};

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [newDuration, setNewDuration] = useState(1440);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isOwner = group ? group.ownerId === user?.id : false;
  const isOwnerOrAdmin = isOwner || user?.role === "ADMIN";

  const loadGroup = () => {
    if (!id) return;
    setLoading(true);
    fetchGroupById(id)
      .then(setGroup)
      .catch(() => setError("Failed to load group"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGroup();
  }, [id]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    searchDebounce.current = setTimeout(() => {
      searchUsers(searchQuery)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchQuery]);

  const resetAddMemberForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setNewDuration(1440);
    setAddError("");
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedUser) return;

    setAddError("");
    setAdding(true);
    try {
      await addGroupMember(id, selectedUser.id, newDuration);
      resetAddMemberForm();
      setShowAddMember(false);
      loadGroup();
    } catch (err: any) {
      setAddError(err.response?.data?.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;

    if (confirmingUserId !== userId) {
      setConfirmingUserId(userId);
      return;
    }

    setRemovingUserId(userId);
    try {
      await removeGroupMember(id, userId);
      loadGroup();
    } catch {
      setError("Failed to remove member");
    } finally {
      setRemovingUserId(null);
      setConfirmingUserId(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (!id) return;
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteGroup(id);
      navigate("/groups");
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || "Failed to delete group");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <GroupDetailSkeleton />
      </AppLayout>
    );
  }

  if (!group) {
    return (
      <AppLayout>
        <p className="text-sm text-on-dark-muted">Group not found.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="">
        <div className="flex items-center gap-1 text-xs font-mono text-on-dark-muted">
          <Link to="/groups" className="hover:text-on-dark transition">
            GROUPS
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-on-dark">{group.id.slice(0, 6)}</span>
        </div>

        <div className="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-mono font-semibold text-on-dark tracking-tight">
                {group.name}
              </h1>
              {isOwner && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide bg-warning/15 text-warning">
                  Owner
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-on-dark-muted">
              Owned by {group.owner.username} · {group.members?.length ?? 0}{" "}
              active member
              {group.members?.length === 1 ? "" : "s"}
            </p>
          </div>

          {isOwnerOrAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-white hover:bg-brand-hover transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add_Member
              </button>
              {isOwner && (
                <button
                  onClick={() => setShowConfirmDeleteModal(true)}
                  className="flex items-center gap-1.5 rounded-md border border-danger/30 px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-danger hover:bg-danger/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-danger font-mono">{error}</p>}

        {showAddMember && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-border-dark bg-surface-raised">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
                <p className="text-sm font-mono font-semibold uppercase tracking-widest text-on-dark">
                  Add_Member
                </p>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    resetAddMemberForm();
                  }}
                  className="text-on-dark-muted hover:text-on-dark transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
                    User
                  </label>

                  {selectedUser ? (
                    <div className="flex items-center justify-between rounded-md border border-border-dark bg-bg px-3 py-2.5">
                      <div>
                        <p className="text-sm text-on-dark">
                          {selectedUser.username}
                        </p>
                        <p className="text-xs text-on-dark-muted">
                          {selectedUser.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(null);
                          setSearchQuery("");
                        }}
                        className="text-xs font-mono uppercase text-on-dark-muted hover:text-on-dark transition"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-dark-muted" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        placeholder="Search by username or email..."
                        className="w-full rounded-md border border-border-dark bg-bg pl-9 pr-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />

                      {searchQuery.trim().length >= 2 && (
                        <div className="mt-1.5 rounded-md border border-border-dark bg-bg max-h-48 overflow-y-auto">
                          {searching ? (
                            <p className="px-3 py-2.5 text-xs text-on-dark-muted">
                              Searching...
                            </p>
                          ) : searchResults.length === 0 ? (
                            <p className="px-3 py-2.5 text-xs text-on-dark-muted">
                              No users found.
                            </p>
                          ) : (
                            searchResults.map((u) => (
                              <button
                                type="button"
                                key={u.id}
                                onClick={() => {
                                  setSelectedUser(u);
                                  setSearchResults([]);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-surface-raised transition"
                              >
                                <p className="text-sm text-on-dark">
                                  {u.username}
                                </p>
                                <p className="text-xs text-on-dark-muted">
                                  {u.email}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
                    Duration
                  </label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.minutes} value={opt.minutes}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {addError && (
                  <p className="text-xs text-danger font-mono">{addError}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMember(false);
                      resetAddMemberForm();
                    }}
                    className="text-xs font-mono uppercase tracking-wide text-on-dark-muted hover:text-on-dark transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding || !selectedUser}
                    className="rounded-md bg-brand px-5 py-2 text-xs font-mono font-semibold uppercase tracking-wide text-white hover:bg-brand-hover disabled:opacity-50 transition"
                  >
                    {adding ? "Adding..." : "Add_Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-border-dark bg-surface-raised overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border-dark">
            <Users className="w-4 h-4 text-on-dark-muted" />
            <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
              Members
            </p>
          </div>

          {!group.members || group.members.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-on-dark-muted">
              No active members yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted border-b border-border-dark">
                    <th className="text-left font-medium px-5 py-3">User</th>
                    <th className="text-left font-medium px-2 py-3">Expires</th>
                    {isOwnerOrAdmin && (
                      <th className="text-right font-medium px-5 py-3">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((m) => {
                    const isConfirming = confirmingUserId === m.userId;
                    const isRemoving = removingUserId === m.userId;

                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border-dark last:border-0"
                      >
                        <td className="px-5 py-3 text-on-dark whitespace-nowrap">
                          {m.user?.username ?? "Unknown user"}
                        </td>
                        <td className="px-2 py-3 text-on-dark-muted text-xs whitespace-nowrap">
                          {expiresLabel(m.expiresAt)}
                        </td>
                        {isOwnerOrAdmin && (
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {isConfirming && !isRemoving && (
                                <button
                                  onClick={() => setConfirmingUserId(null)}
                                  className="text-[10px] font-mono uppercase tracking-wide text-on-dark-muted hover:text-on-dark transition"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(m.userId)}
                                disabled={isRemoving}
                                className="text-xs font-mono uppercase text-danger hover:underline disabled:opacity-50"
                              >
                                {isRemoving
                                  ? "Removing..."
                                  : isConfirming
                                    ? "Confirm"
                                    : "Remove"}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showConfirmDeleteModal && (
        <ConfirmDeleteModal
          title="Delete_Group"
          message={
            deleteError
              ? deleteError
              : `Delete "${group.name}"? This removes all its memberships and can't be undone.`
          }
          confirmLabel="Delete"
          danger
          loading={deleting}
          onConfirm={handleDeleteGroup}
          onCancel={() => setShowConfirmDeleteModal(false)}
        />
      )}
    </AppLayout>
  );
};

export default GroupDetailPage;
