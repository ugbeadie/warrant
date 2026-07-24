import api from "./axios";

export interface PlatformStats {
  totalUsers: number;
  totalResources: number;
  totalGroups: number;
  activeGrants: number;
  pendingRequests: number;
  unusedGrants: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  platformRole: "USER" | "ADMIN";
  createdAt: string;
  _count: {
    grants: number;
    ownedResources: number;
    ownedGroups: number;
  };
}

export interface UnusedGrantReportEntry {
  id: string;
  subjectType: "USER" | "GROUP";
  grantedAt: string;
  lastAccessedAt: string | null;
  expiresAt: string;
  resource: {
    id: string;
    name: string;
    owner: { id: string; username: string };
  };
  role: { id: string; name: string };
  user: { id: string; username: string } | null;
  group: { id: string; name: string } | null;
}

export const fetchPlatformStats = async (): Promise<PlatformStats> => {
  const { data } = await api.get("/admin/stats");
  return data;
};

export const fetchAllUsers = async (): Promise<AdminUser[]> => {
  const { data } = await api.get("/admin/users");
  return data.users;
};

export const fetchUnusedGrantsReport = async (): Promise<{
  grants: UnusedGrantReportEntry[];
  thresholdDays: number;
}> => {
  const { data } = await api.get("/admin/unused-grants");
  return data;
};
