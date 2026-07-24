import api from "./axios";
import type { AuditLogEntry } from "../types";

export interface AuditLogParams {
  page?: number;
  action?: string;
  resourceName?: string;
  actorName?: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export const fetchMyAuditLog = async (
  params?: AuditLogParams,
): Promise<AuditLogResponse> => {
  const { data } = await api.get("/audit-log/mine", { params });
  return data;
};

export const fetchAllAuditLog = async (
  params?: AuditLogParams,
): Promise<AuditLogResponse> => {
  const { data } = await api.get("/audit-log/all", { params });
  return data;
};
