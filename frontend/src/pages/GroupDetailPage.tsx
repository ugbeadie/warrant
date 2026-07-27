import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Users,
  UserPlus,
  X,
  Search,
  Trash2,
  Repeat,
} from "lucide-react";
import {
  fetchGroupById,
  addGroupMember,
  removeGroupMember,
  deleteGroup,
  transferGroupOwnership,
  leaveGroup,
} from "../lib/groups";
import { searchUsers, type UserSearchResult } from "../lib/users";
import { AppLayout } from "../components/AppLayout";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { Group } from "../types";

const DURATION_OPTIONS = [
  { label: "1 Day", minutes: 1440 },
  { label: "1 Week", minutes: 10080 },
  { label: "30 Days", minutes: 43200 },
  { label: "90 Days", minutes: 129600 },
  { label: "Custom", minutes: -1 },
];

const expiresLabel = (expiresAt: string | null) => {
  if (!expiresAt) return "Never";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
};

const GroupDetailSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-3 w-24 bg-border-dark rounded" />
    <div className="mt-3 flex items-center justify-between">
      <div>
        <div className="h-7 w-48 bg-border-dark rounded" />
        <div className="mt-2 h-4 w-64 bg-border-dark rounded" />
      </div>
      <div className="h-9 w-28 bg-border-dark rounded-md" />
    </div>
    <div className="mt-6 rounded-xl border border-border-dark bg-surface-raised overflow-hidden">
      <div className="h-12 border-b border-border-dark" />
      <div className="h-14 border-b border-border-dark" />
      <div className="h-14 border-b border-border-dark" />
      <div className="h-14" />
    </div>
  </div>
);

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );

  const [newDurationChoice, setNewDurationChoice] = useState(1440);
  const [customValue, setCustomValue] = useState(1);
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours" | "days">(
    "days",
  );

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);

  const [leavingSelf, setLeavingSelf] = useState(false);
  const [confirmingLeaveSelf, setConfirmingLeaveSelf] = useState(false);

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferQuery, setTransferQuery] = useState("");
  const [transferResults, setTransferResults] = useState<UserSearchResult[]>(
    [],
  );
  const [transferSearching, setTransferSearching] = useState(false);
  const [transferTarget, setTransferTarget] = useState<UserSearchResult | null>(
    null,
  );
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);
  const transferDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = group ? group.ownerId === user?.id : false;
  const isOwnerOrAdmin = isOwner || user?.role === "ADMIN";

  const isSelfMember =
    !isOwner && !!group?.members?.some((m) => m.userId === user?.id);

  const showActionsColumn = isOwner || isSelfMember;

  const isCustom = newDurationChoice === -1;

  const newDuration = useMemo(() => {
    if (!isCustom) return newDurationChoice;
    const multiplier =
      customUnit === "minutes" ? 1 : customUnit === "hours" ? 60 : 1440;
    return Math.max(1, Math.round(customValue * multiplier));
  }, [isCustom, newDurationChoice, customValue, customUnit]);

  const loadGroup = () => {
    if (!id) return;
    setLoading(true);
    fetchGroupById(id)
      .then(setGroup)
      .catch(() => toast.error("Failed to load group"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (transferDebounce.current) clearTimeout(transferDebounce.current);

    if (transferQuery.trim().length < 2) {
      setTransferResults([]);
      return;
    }

    setTransferSearching(true);
    transferDebounce.current = setTimeout(() => {
      searchUsers(transferQuery)
        .then((results) =>
          setTransferResults(results.filter((u) => u.id !== group?.ownerId)),
        )
        .catch(() => setTransferResults([]))
        .finally(() => setTransferSearching(false));
    }, 300);

    return () => {
      if (transferDebounce.current) clearTimeout(transferDebounce.current);
    };
  }, [transferQuery, group?.ownerId]);

  const resetAddMemberForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setNewDurationChoice(1440);
    setCustomValue(1);
    setCustomUnit("days");
    setAddError("");
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedUser) return;

    if (isCustom && newDuration < 1) {
      setAddError("Duration must be at least 1 minute");
      return;
    }

    setAddError("");
    setAdding(true);

    const addedUsername = selectedUser.username;

    try {
      await addGroupMember(id, selectedUser.id, newDuration);
      resetAddMemberForm();
      setShowAddMember(false);
      loadGroup();
      toast.success(`${addedUsername} added to the group`);
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

    const removedUsername = group?.members?.find((m) => m.userId === userId)
      ?.user?.username;

    try {
      await removeGroupMember(id, userId);
      loadGroup();
      toast.success(
        removedUsername
          ? `${removedUsername} removed from the group`
          : "Member removed",
      );
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemovingUserId(null);
      setConfirmingUserId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!id) return;

    if (!confirmingLeaveSelf) {
      setConfirmingLeaveSelf(true);
      return;
    }

    setLeavingSelf(true);
    try {
      await leaveGroup(id);
      toast.success(`Left "${group?.name ?? "group"}"`);
      navigate("/groups");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to leave group");
      setLeavingSelf(false);
      setConfirmingLeaveSelf(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!id) return;
    setDeleteError("");
    setDeleting(true);
    try {
      const deletedName = group?.name;
      await deleteGroup(id);
      toast.success(
        deletedName ? `Group "${deletedName}" deleted` : "Group deleted",
      );
      navigate("/groups");
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || "Failed to delete group");
      setDeleting(false);
    }
  };

  const resetTransferForm = () => {
    setTransferQuery("");
    setTransferResults([]);
    setTransferTarget(null);
    setTransferError("");
    setConfirmingTransfer(false);
  };

  const handleTransfer = async () => {
    if (!id || !transferTarget) return;

    if (!confirmingTransfer) {
      setConfirmingTransfer(true);
      return;
    }

    setTransferError("");
    setTransferring(true);
    try {
      const newOwnerUsername = transferTarget.username;
      await transferGroupOwnership(id, transferTarget.id);
      resetTransferForm();
      setShowTransfer(false);
      loadGroup();
      toast.success(`Ownership transferred to ${newOwnerUsername}`);
    } catch (err: any) {
      setTransferError(
        err.response?.data?.message || "Failed to transfer ownership",
      );
    } finally {
      setTransferring(false);
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

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isOwner && (
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-white cursor-pointer hover:bg-brand-hover transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add_Member
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setShowTransfer(true)}
                className="flex items-center gap-1.5 rounded-md border border-border-dark px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-on-dark cursor-pointer hover:bg-bg transition"
              >
                <Repeat className="w-3.5 h-3.5" />
                Transfer
              </button>
            )}
            {isOwnerOrAdmin && (
              <button
                onClick={() => setShowConfirmDeleteModal(true)}
                className="flex items-center gap-1.5 rounded-md border border-danger/30 px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-danger cursor-pointer hover:bg-danger/10 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>

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
                  className="text-on-dark-muted cursor-pointer hover:text-on-dark transition"
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
                        className="text-xs font-mono uppercase text-on-dark-muted cursor-pointer hover:text-on-dark transition"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-dark-muted" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoFocus
                          placeholder="Search by username or email..."
                          className="w-full rounded-md border border-border-dark bg-bg pl-9 pr-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                      </div>

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
                                className="w-full text-left px-3 py-2 cursor-pointer hover:bg-surface-raised transition"
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
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
                    Duration
                  </label>
                  <select
                    value={newDurationChoice}
                    onChange={(e) =>
                      setNewDurationChoice(Number(e.target.value))
                    }
                    className="w-full rounded-md border border-border-dark bg-bg px-3 py-2.5 text-sm text-on-dark font-mono cursor-pointer outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.minutes}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {isCustom && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={customValue}
                        onChange={(e) => setCustomValue(Number(e.target.value))}
                        className="w-24 rounded-md border border-border-dark bg-bg px-3 py-2 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />
                      <select
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value as any)}
                        className="flex-1 rounded-md border border-border-dark bg-bg px-3 py-2 text-sm text-on-dark font-mono cursor-pointer outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  )}
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
                    className="text-xs font-mono uppercase tracking-wide text-on-dark-muted cursor-pointer hover:text-on-dark transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding || !selectedUser}
                    className="rounded-md bg-brand px-5 py-2 text-xs font-mono font-semibold uppercase tracking-wide text-white cursor-pointer hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {adding ? "Adding..." : "Add_Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showTransfer && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-border-dark bg-surface-raised">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark">
                <p className="text-sm font-mono font-semibold uppercase tracking-widest text-on-dark">
                  Transfer_Ownership
                </p>
                <button
                  onClick={() => {
                    setShowTransfer(false);
                    resetTransferForm();
                  }}
                  className="text-on-dark-muted cursor-pointer hover:text-on-dark transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-on-dark-muted mb-1.5">
                    New Owner
                  </label>

                  {transferTarget ? (
                    <div className="flex items-center justify-between rounded-md border border-border-dark bg-bg px-3 py-2.5">
                      <div>
                        <p className="text-sm text-on-dark">
                          {transferTarget.username}
                        </p>
                        <p className="text-xs text-on-dark-muted">
                          {transferTarget.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTransferTarget(null);
                          setTransferQuery("");
                          setConfirmingTransfer(false);
                        }}
                        className="text-xs font-mono uppercase text-on-dark-muted cursor-pointer hover:text-on-dark transition"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-dark-muted" />
                        <input
                          type="text"
                          value={transferQuery}
                          onChange={(e) => setTransferQuery(e.target.value)}
                          autoFocus
                          placeholder="Search by username or email..."
                          className="w-full rounded-md border border-border-dark bg-bg pl-9 pr-3 py-2.5 text-sm text-on-dark font-mono outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                      </div>

                      {transferQuery.trim().length >= 2 && (
                        <div className="mt-1.5 rounded-md border border-border-dark bg-bg max-h-48 overflow-y-auto">
                          {transferSearching ? (
                            <p className="px-3 py-2.5 text-xs text-on-dark-muted">
                              Searching...
                            </p>
                          ) : transferResults.length === 0 ? (
                            <p className="px-3 py-2.5 text-xs text-on-dark-muted">
                              No users found.
                            </p>
                          ) : (
                            transferResults.map((u) => (
                              <button
                                type="button"
                                key={u.id}
                                onClick={() => {
                                  setTransferTarget(u);
                                  setTransferResults([]);
                                }}
                                className="w-full text-left px-3 py-2 cursor-pointer hover:bg-surface-raised transition"
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
                    </>
                  )}
                </div>

                {transferTarget && (
                  <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
                    You'll be downgraded to a regular 1-day member.{" "}
                    {transferTarget.username} becomes the permanent owner and
                    gains full control of this group.
                  </div>
                )}

                {transferError && (
                  <p className="text-xs text-danger font-mono">
                    {transferError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransfer(false);
                      resetTransferForm();
                    }}
                    className="text-xs font-mono uppercase tracking-wide text-on-dark-muted cursor-pointer hover:text-on-dark transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleTransfer}
                    disabled={transferring || !transferTarget}
                    className={`rounded-md px-5 py-2 text-xs font-mono font-semibold uppercase tracking-wide text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition ${
                      confirmingTransfer
                        ? "bg-warning hover:bg-warning/90"
                        : "bg-brand hover:bg-brand-hover"
                    }`}
                  >
                    {transferring
                      ? "Transferring..."
                      : confirmingTransfer
                        ? "Confirm_Transfer"
                        : "Transfer_Ownership"}
                  </button>
                </div>
              </div>
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
                    {showActionsColumn && (
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
                    const isMemberOwner = m.userId === group.ownerId;
                    const isMyOwnRow = m.userId === user?.id;

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
                        {showActionsColumn && (
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            {isMemberOwner ? (
                              <span className="text-[10px] font-mono uppercase text-on-dark-muted">
                                Owner
                              </span>
                            ) : isOwner ? (
                              <div className="flex items-center justify-end gap-2">
                                {isConfirming && !isRemoving && (
                                  <button
                                    onClick={() => setConfirmingUserId(null)}
                                    className="text-[10px] font-mono uppercase tracking-wide text-on-dark-muted cursor-pointer hover:text-on-dark transition"
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMember(m.userId)}
                                  disabled={isRemoving}
                                  className="text-xs font-mono uppercase text-danger cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isRemoving
                                    ? "Removing..."
                                    : isConfirming
                                      ? "Confirm"
                                      : "Remove"}
                                </button>
                              </div>
                            ) : isMyOwnRow ? (
                              <div className="flex items-center justify-end gap-2">
                                {confirmingLeaveSelf && !leavingSelf && (
                                  <button
                                    onClick={() =>
                                      setConfirmingLeaveSelf(false)
                                    }
                                    className="text-[10px] font-mono uppercase tracking-wide text-on-dark-muted cursor-pointer hover:text-on-dark transition"
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button
                                  onClick={handleLeaveGroup}
                                  disabled={leavingSelf}
                                  className="text-xs font-mono uppercase text-danger cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {leavingSelf
                                    ? "Leaving..."
                                    : confirmingLeaveSelf
                                      ? "Confirm"
                                      : "Leave"}
                                </button>
                              </div>
                            ) : null}
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
