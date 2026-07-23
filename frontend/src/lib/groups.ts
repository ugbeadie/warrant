import api from "./axios";
import type { Group, GroupMember } from "../types";

export const fetchMyMemberships = async (): Promise<GroupMember[]> => {
  const { data } = await api.get("/groups/memberships/mine");
  return data.memberships;
};

export const fetchAllGroups = async (): Promise<Group[]> => {
  const { data } = await api.get("/groups/all");
  return data.groups;
};

export const fetchMyOwnedGroups = async (): Promise<Group[]> => {
  const { data } = await api.get("/groups/mine-owned");
  return data.groups;
};

export const fetchGroupById = async (id: string): Promise<Group> => {
  const { data } = await api.get(`/groups/${id}`);
  return data.group;
};

export const createGroup = async (name: string): Promise<Group> => {
  const { data } = await api.post("/groups/create", { name });
  return data.group;
};

export const addGroupMember = async (
  groupId: string,
  userId: string,
  durationMinutes: number,
): Promise<void> => {
  await api.post(`/groups/${groupId}/add-member`, { userId, durationMinutes });
};

export const removeGroupMember = async (
  groupId: string,
  userId: string,
): Promise<void> => {
  await api.post(`/groups/${groupId}/remove-member`, { userId });
};

export const deleteGroup = async (id: string): Promise<void> => {
  await api.delete(`/groups/${id}`);
};

export const transferGroupOwnership = async (
  groupId: string,
  newOwnerId: string,
): Promise<Group> => {
  const { data } = await api.post(`/groups/${groupId}/transfer`, {
    newOwnerId,
  });
  return data.group;
};

export const leaveGroup = async (groupId: string): Promise<void> => {
  await api.post(`/groups/${groupId}/leave`);
};
