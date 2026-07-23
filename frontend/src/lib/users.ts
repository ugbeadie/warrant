import api from "./axios";

export interface UserSearchResult {
  id: string;
  username: string;
  email: string;
}

export const searchUsers = async (
  query: string,
): Promise<UserSearchResult[]> => {
  if (query.trim().length < 2) return [];
  const { data } = await api.get("/users/search", { params: { q: query } });
  return data.users;
};
