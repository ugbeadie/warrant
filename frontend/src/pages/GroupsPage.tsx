import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { fetchAllGroups, fetchMyOwnedGroups } from "../lib/groups";
import { AppLayout } from "../components/AppLayout";
import { ResourceCardSkeleton } from "../components/ResourceCardSkeleton";
import { CreateGroupModal } from "../components/CreateGroupModal";
import { useAuth } from "../context/AuthContext";
import type { Group } from "../types";

const GroupsPage = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "all">("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data =
          scope === "all" ? await fetchAllGroups() : await fetchMyOwnedGroups();
        setGroups(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [scope]);

  const handleCreated = (group: Group) => {
    setGroups((prev) => [group, ...prev]);
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppLayout>
      <div className="">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-mono font-semibold text-on-dark tracking-tight">
              GROUPS_MANAGEMENT
            </h1>
            <p className="mt-1 text-sm text-on-dark-muted">
              Manage groups and grant them shared access to resources.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups..."
              className="rounded-md border border-border-dark bg-surface-raised px-3.5 py-2 text-sm text-on-dark font-mono placeholder:text-on-dark-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 font-mono uppercase rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition shrink-0"
            >
              New_Group
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
          <CreateGroupModal
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
          />
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <>
              <ResourceCardSkeleton />
              <ResourceCardSkeleton />
              <ResourceCardSkeleton />
            </>
          ) : filteredGroups.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-on-dark-muted">
              {search ? "No groups match your search." : "No groups yet."}
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-border-dark bg-surface-raised p-5 hover:border-brand transition"
              >
                <div className="flex items-center justify-between">
                  <Users className="w-5 h-5 text-brand" />
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide bg-neutral/15 text-neutral">
                    {group.members?.length ?? 0} member
                    {group.members?.length === 1 ? "" : "s"}
                  </span>
                </div>

                <p className="mt-4 text-sm font-semibold text-on-dark">
                  {group.name}
                </p>

                <div className="mt-4 pt-4 border-t border-border-dark flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase text-on-dark-muted">
                      Owner
                    </p>
                    <p className="text-xs text-on-dark">
                      {group.owner.username}
                    </p>
                  </div>
                  <Link
                    to={`/groups/${group.id}`}
                    className="rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-brand/15 text-brand hover:bg-brand/25 transition"
                  >
                    {group.ownerId === user?.id ? "Manage" : "View"}
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default GroupsPage;
