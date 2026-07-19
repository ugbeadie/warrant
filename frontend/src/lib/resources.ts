import api from "../api/axios";
import type { Resource } from "../types";

export const fetchMyResources = async (): Promise<Resource[]> => {
  const { data } = await api.get("/resources/my-resources");
  return data.resources;
};

export const fetchAllResources = async (): Promise<Resource[]> => {
  const { data } = await api.get("/resources/all");
  return data.resources;
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
