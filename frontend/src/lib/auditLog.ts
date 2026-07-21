import api from "./axios";
import type { AuditLogEntry } from "../types";

export const fetchMyAuditLog = async (
  limit?: number,
): Promise<AuditLogEntry[]> => {
  const { data } = await api.get("/audit-log/mine", { params: { limit } });
  return data.entries;
};

export const fetchAllAuditLog = async (
  limit?: number,
): Promise<AuditLogEntry[]> => {
  const { data } = await api.get("/audit-log/all", { params: { limit } });
  return data.entries;
};
