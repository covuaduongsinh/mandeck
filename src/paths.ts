// B1/D1 basename rule: "/" stays "/", the home directory yields the user's
// directory name — no special-casing. Shared by the workspace auto-rename
// rule (B1) and the pane-header title chain (D1).
export function basenameOf(p: string): string {
  if (p === "/") return "/";
  const trimmed = p.endsWith("/") ? p.slice(0, -1) : p;
  const idx = trimmed.lastIndexOf("/");
  const base = idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
  return base || "/";
}
