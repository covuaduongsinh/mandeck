// Pure state-schema logic shared by the main process, the renderer, and
// scripts/test-migration.mjs. Must stay free of electron and node:fs imports
// so it can run anywhere (browser bundle, plain node).

// A1 accent palette in its fixed rotation order (SPEC A1).
export const ACCENT_HUES = [
  "#58C142", // green
  "#00FFDB", // teal
  "#429DFF", // blue
  "#BF55EC", // purple
  "#FF453A", // red
  "#FF9500", // orange
  "#FFE900", // yellow
];

export const DEFAULT_ACCENT = "#429DFF";

// B1 assignment scan: first hue not owned by any existing workspace, scanning
// the rotation starting at the default accent; past seven owners, the
// least-owned hue wins, ties broken by the same scan order.
export function assignAccentHue(ownedHues, defaultAccent = DEFAULT_ACCENT) {
  const startIdx = Math.max(0, ACCENT_HUES.indexOf(defaultAccent));
  const order = [];
  for (let i = 0; i < ACCENT_HUES.length; i++) {
    order.push(ACCENT_HUES[(startIdx + i) % ACCENT_HUES.length]);
  }
  const free = order.find((h) => !ownedHues.includes(h));
  if (free) return free;
  let best = order[0];
  let bestCount = Infinity;
  for (const h of order) {
    const count = ownedHues.reduce((n, o) => (o === h ? n + 1 : n), 0);
    if (count < bestCount) {
      best = h;
      bestCount = count;
    }
  }
  return best;
}

// The existing field-by-field v1 validation (B3 load decision table).
export function validateV1(doc) {
  if (!doc || typeof doc !== "object") return false;
  if (doc.version !== 1) return false;
  if (!Array.isArray(doc.tabs) || doc.tabs.length === 0) return false;
  if (typeof doc.activeTabId !== "string") return false;
  for (const t of doc.tabs) {
    if (
      !t ||
      typeof t.tid !== "string" ||
      !Array.isArray(t.cols) ||
      typeof t.focusedPaneId !== "string"
    ) return false;
    for (const c of t.cols) {
      if (!c || typeof c.cid !== "string" || !Array.isArray(c.panes)) return false;
      if (c.panes.some((p) => typeof p !== "string")) return false;
    }
  }
  return true;
}

// v2 shape validation (B3). Deliberately tolerant of repairable fields:
// accentHue, activeWorkspaceId references, maximizedPaneId, paneCwds,
// windowBounds, and sidebarVisible never cause rejection here — repairV2
// normalizes them. An empty workspaces array (or a pane-less workspace,
// which leaves nothing to repair focus onto) fails validation.
export function validateV2(doc) {
  if (!doc || typeof doc !== "object") return false;
  if (doc.version !== 2) return false;
  if (!Array.isArray(doc.workspaces) || doc.workspaces.length === 0) return false;
  if (typeof doc.activeWorkspaceId !== "string") return false;
  for (const w of doc.workspaces) {
    if (
      !w ||
      typeof w.id !== "string" ||
      typeof w.title !== "string" ||
      typeof w.autoNamed !== "boolean" ||
      !Array.isArray(w.cols) ||
      typeof w.focusedPaneId !== "string"
    ) return false;
    let paneCount = 0;
    for (const c of w.cols) {
      if (!c || typeof c.cid !== "string" || !Array.isArray(c.panes)) return false;
      if (c.panes.some((p) => typeof p !== "string")) return false;
      paneCount += c.panes.length;
    }
    if (paneCount === 0) return false;
  }
  return true;
}

// B3 migration mapping: a verbatim wrap plus one additive field (accentHue,
// assigned in array order by the B1 scan). Ids, titles, structure, focus,
// maximize state, and paneCwds carry over unchanged.
export function migrateV1toV2(v1, defaultAccent = DEFAULT_ACCENT) {
  const owned = [];
  const workspaces = v1.tabs.map((t) => {
    const accentHue = assignAccentHue(owned, defaultAccent);
    owned.push(accentHue);
    return {
      id: t.tid,
      title: typeof t.title === "string" ? t.title : "shell",
      autoNamed: typeof t.autoNamed === "boolean" ? t.autoNamed : true,
      accentHue,
      cols: t.cols,
      focusedPaneId: t.focusedPaneId,
      maximizedPaneId: typeof t.maximizedPaneId === "string" ? t.maximizedPaneId : null,
    };
  });
  return {
    version: 2,
    workspaces,
    activeWorkspaceId: v1.activeTabId,
    paneCwds: v1.paneCwds && typeof v1.paneCwds === "object" ? v1.paneCwds : {},
  };
}

function maxSuffixPane(panes) {
  let best = panes[0];
  let bestN = -1;
  for (const p of panes) {
    const n = Number(p.slice(1));
    if (Number.isFinite(n) && n > bestN) {
      bestN = n;
      best = p;
    }
  }
  return best;
}

// Pane view types: only non-terminal entries are stored ("files" today);
// absence, a wrong type, an unknown view value, or an entry keyed by a pane
// that no longer exists all normalize to terminal — never a rejection and
// never a version bump (same tolerance contract as sidebarVisible).
function repairPaneViews(raw, livePaneIds) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [pid, view] of Object.entries(raw)) {
    if (view === "files" && livePaneIds.has(pid)) out[pid] = view;
  }
  return out;
}

// Hydration repairs (B3 §7, B4 §7): dangling activeWorkspaceId → first
// workspace; missing/invalid accentHue → re-assigned in array order by the
// B1 scan; dangling focusedPaneId → max-suffix pane; dangling
// maximizedPaneId → null; sidebarVisible absent/non-boolean → true;
// paneViews normalized by repairPaneViews above.
// Never rejects — input must already pass validateV2.
export function repairV2(doc, defaultAccent = DEFAULT_ACCENT) {
  const owned = doc.workspaces
    .map((w) => w.accentHue)
    .filter((h) => ACCENT_HUES.includes(h));
  const workspaces = doc.workspaces.map((w) => {
    let accentHue = w.accentHue;
    if (!ACCENT_HUES.includes(accentHue)) {
      accentHue = assignAccentHue(owned, defaultAccent);
      owned.push(accentHue);
    }
    const panes = w.cols.flatMap((c) => c.panes);
    const focusedPaneId = panes.includes(w.focusedPaneId)
      ? w.focusedPaneId
      : maxSuffixPane(panes);
    let maximizedPaneId =
      typeof w.maximizedPaneId === "string" ? w.maximizedPaneId : null;
    if (maximizedPaneId !== null && !panes.includes(maximizedPaneId)) {
      maximizedPaneId = null;
    }
    return {
      id: w.id,
      title: w.title,
      autoNamed: w.autoNamed,
      accentHue,
      cols: w.cols,
      focusedPaneId,
      maximizedPaneId,
    };
  });
  const activeWorkspaceId = workspaces.some((w) => w.id === doc.activeWorkspaceId)
    ? doc.activeWorkspaceId
    : workspaces[0].id;
  const livePaneIds = new Set(
    workspaces.flatMap((w) => w.cols.flatMap((c) => c.panes))
  );
  const out = {
    version: 2,
    workspaces,
    activeWorkspaceId,
    paneCwds: doc.paneCwds && typeof doc.paneCwds === "object" ? doc.paneCwds : {},
    paneViews: repairPaneViews(doc.paneViews, livePaneIds),
    sidebarVisible: typeof doc.sidebarVisible === "boolean" ? doc.sidebarVisible : true,
  };
  const wb = doc.windowBounds;
  if (
    wb &&
    typeof wb === "object" &&
    [wb.x, wb.y, wb.w, wb.h].every((n) => typeof n === "number" && Number.isFinite(n))
  ) {
    out.windowBounds = { x: wb.x, y: wb.y, w: wb.w, h: wb.h };
  }
  return out;
}
