import api from "./axios";
import type { AccessRequest } from "../types";

export const fetchPendingForOwner = async (): Promise<AccessRequest[]> => {
  const { data } = await api.get("/requests/pending");
  return data.requests;
};

export const fetchAllPending = async (): Promise<AccessRequest[]> => {
  const { data } = await api.get("/requests/pending/all");
  return data.requests;
};

export const decideRequest = async (
  requestId: string,
  decision: "APPROVED" | "DENIED",
): Promise<{ request: AccessRequest; grant: unknown | null }> => {
  const { data } = await api.patch(`/requests/${requestId}/decide`, {
    decision,
  });
  return data;
};

export const fetchMyRequestForResource = async (
  resourceId: string,
): Promise<AccessRequest | null> => {
  const { data } = await api
    .get(`/requests/mine/${resourceId}`)
    .catch(() => ({ data: { request: null } }));
  return data.request;
};

export const createAccessRequest = async (payload: {
  resourceId: string;
  requestedRoleName: string;
  reason: string;
  durationMinutes: number;
  groupId?: string | null;
}): Promise<{
  request: AccessRequest;
  grant: unknown | null;
  message: string;
}> => {
  const { data } = await api.post("/requests/create", payload);
  return data;
};
