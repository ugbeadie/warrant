import api from "../api/axios";
import type { AccessRequest } from "../types";

export const fetchPendingForOwner = async (): Promise<AccessRequest[]> => {
  const { data } = await api.get("/requests/pending");
  return data.requests;
};
