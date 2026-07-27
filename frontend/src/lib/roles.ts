export const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer", rank: 1 },
  { value: "editor", label: "Editor", rank: 2 },
  { value: "admin", label: "Admin", rank: 3 },
];

export const ROLE_RANKS: Record<string, number> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.rank]),
);

export const MAX_ROLE_RANK = Math.max(...ROLE_OPTIONS.map((r) => r.rank));
