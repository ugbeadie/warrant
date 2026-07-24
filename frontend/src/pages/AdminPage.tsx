import { useState, useEffect } from "react";
import { Users, Server, Layers, Key, Clock, TriangleAlert } from "lucide-react";
import {
  fetchPlatformStats,
  fetchAllUsers,
  fetchUnusedGrantsReport,
  type PlatformStats,
  type AdminUser,
  type UnusedGrantReportEntry,
} from "../lib/admin";
import { AppLayout } from "../components/AppLayout";
import { SkeletonCard } from "../components/SkeletonCard";
import { SkeletonRow } from "../components/SkeletonRow";
import { SummaryCard } from "../components/SummaryCard";

const daysAgo = (dateStr: string | null) => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const AdminPage = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [unusedGrants, setUnusedGrants] = useState<UnusedGrantReportEntry[]>(
    [],
  );
  const [thresholdDays, setThresholdDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, usersData, unusedData] = await Promise.all([
          fetchPlatformStats(),
          fetchAllUsers(),
          fetchUnusedGrantsReport(),
        ]);
        setStats(statsData);
        setUsers(usersData);
        setUnusedGrants(unusedData.grants);
        setThresholdDays(unusedData.thresholdDays);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-6xl">
        <h1 className="text-2xl font-mono font-semibold text-on-dark tracking-tight">
          ADMIN_CONSOLE
        </h1>
        <p className="mt-1 text-sm text-on-dark-muted">
          Platform-wide oversight and reporting.
        </p>

        {/* Platform Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading || !stats ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <SummaryCard
                label="Users"
                value={stats.totalUsers}
                accent="brand"
                icon={<Users className="w-4 h-4" />}
              />
              <SummaryCard
                label="Resources"
                value={stats.totalResources}
                accent="brand"
                icon={<Server className="w-4 h-4" />}
              />
              <SummaryCard
                label="Groups"
                value={stats.totalGroups}
                accent="brand"
                icon={<Layers className="w-4 h-4" />}
              />
              <SummaryCard
                label="Active Grants"
                value={stats.activeGrants}
                accent="brand"
                icon={<Key className="w-4 h-4" />}
              />
              <SummaryCard
                label="Pending Requests"
                value={stats.pendingRequests}
                accent="warning"
                icon={<Clock className="w-4 h-4" />}
              />
              <SummaryCard
                label="Unused Grants"
                value={stats.unusedGrants}
                accent="danger"
                icon={<TriangleAlert className="w-4 h-4" />}
              />
            </>
          )}
        </div>

        {/* User Management */}
        <div className="mt-8 rounded-xl border border-border-dark bg-surface-raised overflow-hidden">
          <div className="px-5 py-4 border-b border-border-dark">
            <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
              All_Users
            </p>
          </div>
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : users.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-on-dark-muted">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted border-b border-border-dark">
                    <th className="text-left font-medium px-5 py-3">
                      Username
                    </th>
                    <th className="text-left font-medium px-2 py-3">Email</th>
                    <th className="text-left font-medium px-2 py-3">Role</th>
                    <th className="text-left font-medium px-2 py-3">Grants</th>
                    <th className="text-left font-medium px-2 py-3">
                      Resources
                    </th>
                    <th className="text-left font-medium px-2 py-3">Groups</th>
                    <th className="text-left font-medium px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border-dark last:border-0"
                    >
                      <td className="px-5 py-3 text-on-dark font-medium whitespace-nowrap">
                        {u.username}
                      </td>
                      <td className="px-2 py-3 text-on-dark-muted whitespace-nowrap">
                        {u.email}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                            u.platformRole === "ADMIN"
                              ? "bg-danger/15 text-danger"
                              : "bg-neutral/15 text-neutral"
                          }`}
                        >
                          {u.platformRole}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-on-dark-muted font-mono text-xs">
                        {u._count.grants}
                      </td>
                      <td className="px-2 py-3 text-on-dark-muted font-mono text-xs">
                        {u._count.ownedResources}
                      </td>
                      <td className="px-2 py-3 text-on-dark-muted font-mono text-xs">
                        {u._count.ownedGroups}
                      </td>
                      <td className="px-5 py-3 text-on-dark-muted font-mono text-xs whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Global Unused-Access Report */}
        <div className="mt-8 rounded-xl border border-border-dark bg-surface-raised overflow-hidden">
          <div className="px-5 py-4 border-b border-border-dark">
            <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
              Unused_Access_Report
            </p>
            <p className="mt-1 text-xs text-on-dark-muted">
              Active grants untouched for {thresholdDays}+ days, across all
              resources.
            </p>
          </div>
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : unusedGrants.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-on-dark-muted">
              No unused grants right now.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-[10px] font-mono uppercase tracking-widest text-on-dark-muted border-b border-border-dark">
                    <th className="text-left font-medium px-5 py-3">
                      Resource
                    </th>
                    <th className="text-left font-medium px-2 py-3">Owner</th>
                    <th className="text-left font-medium px-2 py-3">Subject</th>
                    <th className="text-left font-medium px-2 py-3">Role</th>
                    <th className="text-left font-medium px-5 py-3">
                      Idle For
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unusedGrants.map((g) => {
                    const idleDays = daysAgo(g.lastAccessedAt ?? g.grantedAt);
                    return (
                      <tr
                        key={g.id}
                        className="border-b border-border-dark last:border-0"
                      >
                        <td className="px-5 py-3 text-on-dark font-medium whitespace-nowrap">
                          {g.resource.name}
                        </td>
                        <td className="px-2 py-3 text-on-dark-muted whitespace-nowrap">
                          {g.resource.owner.username}
                        </td>
                        <td className="px-2 py-3 text-on-dark-muted whitespace-nowrap">
                          {g.subjectType === "GROUP"
                            ? `Group: ${g.group?.name ?? "Unknown"}`
                            : (g.user?.username ?? "Unknown")}
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide bg-warning/15 text-warning">
                            {g.role.name}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-on-dark-muted font-mono text-xs whitespace-nowrap">
                          {idleDays !== null ? `${idleDays}d` : "—"}
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

export default AdminPage;
