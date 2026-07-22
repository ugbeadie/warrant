export type PlatformRole = "USER" | "ADMIN";
export type RequestStatus = "PENDING" | "APPROVED" | "DENIED";
export type GrantStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "SURRENDERED";
export type MembershipStatus = "ACTIVE" | "EXPIRED";
export type SubjectType = "USER" | "GROUP";

export interface User {
  id: string;
  username: string;
  email: string;
  role?: PlatformRole;
}

export interface Role {
  id: string;
  name: string;
  rank: number;
}

export interface Resource {
  id: string;
  name: string;
  ownerId: string;
  requiredRoleId: string;
  createdAt: string;
  owner: User;
  requiredRole: Role;
}

export interface Group {
  id: string;
  name: string;
  isDepartment: boolean;
  ownerId: string;
  createdAt: string;
  owner: User;
  members: GroupMember[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  expiresAt: string;
  status: MembershipStatus;
  createdAt: string;
  user: User;
  group?: Group;
}

export interface AccessRequest {
  id: string;
  requesterId: string;
  resourceId: string;
  requestedRoleId: string;
  reason: string;
  durationMinutes: number;
  status: RequestStatus;
  approverId: string | null;
  decidedAt: string | null;
  createdAt: string;
  requester: User;
  resource: Resource;
  requestedRole: Role;
  approver: User | null;
  grant?: Grant | null;
  meetsRequiredRole?: boolean;
}

export interface Grant {
  id: string;
  requestId: string | null;
  subjectType: SubjectType;
  userId: string | null;
  groupId: string | null;
  resourceId: string;
  roleId: string;
  grantedAt: string;
  expiresAt: string;
  status: GrantStatus;
  lastAccessedAt: string | null;
  resource?: Resource;
  role?: Role;
  user?: { id: string; username: string } | null;
  group?: { id: string; name: string } | null;
}

export interface PolicyRule {
  id: string;
  resourceId: string;
  condition: { maxDuration?: number; [key: string]: unknown };
  autoApprove: boolean;
  maxRoleId: string;
  createdAt: string;
  maxRole: Role;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CheckAccessResult {
  hasAccess: boolean;
  insufficient?: boolean;
  reason: string;
  source?: "direct" | "group";
  group?: Group;
  grant?: Grant;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  resourceId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
  actor: User;
  resource: { id: string; name: string } | null;
}
