import api from "../api/axios";
import type { AccessRequest } from "../types";

export const fetchPendingForOwner = async (): Promise<AccessRequest[]> => {
  const { data } = await api.get("/requests/pending");
  return data.requests;
};

export const fetchMyRequestForResource = async (
  resourceId: string,
): Promise<AccessRequest | null> => {
  const { data } = await api.get(`/requests/mine/${resourceId}`);
  return data.request;
};

export const createAccessRequest = async (payload: {
  resourceId: string;
  requestedRoleName: string;
  reason: string;
  durationMinutes: number;
}): Promise<{
  request: AccessRequest;
  grant: unknown | null;
  message: string;
}> => {
  const { data } = await api.post("/requests/create", payload);
  return data;
};
