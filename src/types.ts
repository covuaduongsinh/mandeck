export type Col = { cid: string; panes: string[] };

export type Edge = "top" | "bottom" | "left" | "right";

export const PANE_DND_TYPE = "mandeck/pane";
export type PaneDragItem = { pid: string; title: string };

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
  windowBounds?: WindowBounds;
  sidebarVisible?: boolean;
};
