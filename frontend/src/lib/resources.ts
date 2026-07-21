import api from "../api/axios";
import type { Resource, CheckAccessResult, Grant, PolicyRule } from "../types";

export const fetchMyResources = async (): Promise<Resource[]> => {
  const { data } = await api.get("/resources/my-resources");
  return data.resources;
};

export const fetchAllResources = async (): Promise<Resource[]> => {
  const { data } = await api.get("/resources/all");
  return data.resources;
};

export const fetchResourceById = async (id: string): Promise<Resource> => {
  const { data } = await api.get(`/resources/${id}`);
  return data.resource;
};

export const createResource = async (
  name: string,
  requiredRoleName: string,
): Promise<Resource> => {
  const { data } = await api.post("/resources/create", {
    name,
    requiredRoleName,
  });
  return data.resource;
};

export const checkResourceAccess = async (
  id: string,
): Promise<CheckAccessResult> => {
  try {
    const { data } = await api.get(`/resources/${id}/access-check`);
    return { hasAccess: true, reason: data.reason, source: data.source };
  } catch (err: any) {
    return {
      hasAccess: false,
      insufficient: !!err.response?.data?.insufficient,
      reason: err.response?.data?.reason ?? "Access denied.",
    };
  }
};

// export const logAccessAttempt = async (id: string): Promise<void> => {
//   await api.post(`/resources/${id}/access`).catch(() => {});
// };

export const fetchGrantsForResource = async (
  resourceId: string,
): Promise<Grant[]> => {
  const { data } = await api.get(`/grants/resource/${resourceId}`);
  return data.grants;
};

export const revokeGrant = async (grantId: string): Promise<void> => {
  await api.patch(`/grants/${grantId}/revoke`);
};

export const fetchPolicyRulesForResource = async (
  resourceId: string,
): Promise<PolicyRule[]> => {
  const { data } = await api.get(`/policy-rules/resource/${resourceId}`);
  return data.rules;
};

export const updateResource = async (
  id: string,
  payload: { name?: string; requiredRoleName?: string },
): Promise<Resource> => {
  const { data } = await api.patch(`/resources/${id}`, payload);
  return data.resource;
};

export const deleteResource = async (id: string): Promise<void> => {
  await api.delete(`/resources/${id}`);
};

export const deleteGrant = async (grantId: string): Promise<void> => {
  await api.delete(`/grants/${grantId}`);
};
