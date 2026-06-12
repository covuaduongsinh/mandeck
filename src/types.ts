export type Col = { cid: string; panes: string[] };

export type Edge = "top" | "bottom" | "left" | "right";

// Columns cap per workspace (B1); left/right drops at the cap fall back to
// top/bottom inserts (D2), so the grid and the drop wash share this constant.
export const MAX_COLS = 5;

export const PANE_DND_TYPE = "mandeck/pane";
export type PaneDragItem = { pid: string; title: string };

// Pane view types: "terminal" is the default and is never stored — the
// persisted paneViews map carries only non-terminal entries, so its absence
// (every state file written before this field existed) means all-terminal.
export type PaneViewKind = "files";

// One chip in the top strip, owning a full pane grid (SPEC B1).
export type Workspace = {
  id: string;
  title: string;
  autoNamed: boolean;
  accentHue: string;
  cols: Col[];
  focusedPaneId: string;
  maximizedPaneId: string | null;
};

export type WindowBounds = { x: number; y: number; w: number; h: number };

export type AppState = {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  paneCwds: Record<string, string>;
  paneViews: Record<string, PaneViewKind>;
  sidebarVisible: boolean;
};

export const PERSIST_VERSION = 2;

// state.json v2 root document (SPEC B3). windowBounds is owned by the main
// process and merged into saves there; the renderer never writes it.
export type PersistedState = {
  version: 2;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  paneCwds: Record<string, string>;
  // Optional like sidebarVisible: absence or a wrong type never rejects
  // hydration and never bumps the schema version — repairV2 normalizes any
  // shape to a clean map of "files" entries keyed by live pane ids.
  paneViews?: Record<string, PaneViewKind>;
  windowBounds?: WindowBounds;
  sidebarVisible?: boolean;
};
