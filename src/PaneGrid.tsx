import { useCallback, useEffect, useRef } from "react";
import { Allotment, type AllotmentHandle } from "allotment";
import { Terminal } from "./Terminal";
import { MAX_COLS, type Col, type Edge } from "./types";

type Props = {
  workspaceId: string;
  cols: Col[];
  focusedPaneId: string;
  maximizedPaneId: string | null;
  paneCwds: Record<string, string>;
  accent: string;
  solidTerminal: boolean;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  active: boolean;
  onFocusPane: (pid: string) => void;
  onClosePane: (pid: string) => void;
  onToggleMaximize: (pid: string) => void;
  onMovePane: (src: string, target: string, edge: Edge) => void;
  onPaneCwd: (pid: string, cwd: string) => void;
};

// The pane grid one workspace owns. Stays mounted while its workspace is
// dormant (display:none) — unmounting would kill the terminals' PTYs (B4).
export function PaneGrid({
  workspaceId,
  cols,
  focusedPaneId,
  maximizedPaneId,
  paneCwds,
  accent,
  solidTerminal,
  fontFamily,
  fontSize,
  lineHeight,
  active,
  onFocusPane,
  onClosePane,
  onToggleMaximize,
  onMovePane,
  onPaneCwd,
}: Props) {
  const totalPanes = cols.reduce((s, c) => s + c.panes.length, 0);

  const outerRef = useRef<AllotmentHandle>(null);
  const innerRefs = useRef<Map<string, AllotmentHandle | null>>(new Map());
  const hasInitialResetRef = useRef(false);
  const prevColsCountRef = useRef(cols.length);
  const prevTotalPanesRef = useRef(totalPanes);

  // Reset Allotment to even splits in three cases:
  //   1. First time this workspace becomes active (initial layout).
  //   2. A column was closed — the remaining columns should redistribute
  //      evenly instead of leaving an empty gap where the closed one was.
  //   3. A pane was closed — its sibling panes in the column should
  //      redistribute evenly for the same reason.
  // Adding a pane never triggers reset, so any custom ratios the user
  // dragged into place survive ⌘D. Subsequent activations never reset
  // splitters, so user-dragged ratios survive workspace switching (B4).
  useEffect(() => {
    if (!active) return;
    const isFirst = !hasInitialResetRef.current;
    const shrunk =
      cols.length < prevColsCountRef.current ||
      totalPanes < prevTotalPanesRef.current;
    prevColsCountRef.current = cols.length;
    prevTotalPanesRef.current = totalPanes;
    if (!isFirst && !shrunk) return;
    const raf = requestAnimationFrame(() => {
      outerRef.current?.reset();
      innerRefs.current.forEach((ref) => ref?.reset());
      hasInitialResetRef.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [active, cols.length, totalPanes]);

  // D2 §7: a left/right drop at the 5-column cap falls back to a top/bottom
  // insert in the target column. The wash must show the half that will
  // actually be used — never a left/right wash that lies — so the same
  // resolution applies to both the hover hint and the drop itself. Removing
  // the dragged pane frees its column only when it was alone in it.
  const resolveDropEdge = useCallback(
    (srcPid: string, edge: Edge): Edge => {
      if (edge === "top" || edge === "bottom") return edge;
      const remaining = cols.filter(
        (c) => !(c.panes.length === 1 && c.panes[0] === srcPid)
      ).length;
      if (remaining < MAX_COLS) return edge;
      return edge === "left" ? "top" : "bottom";
    },
    [cols]
  );

  return (
    <div
      className="workspace"
      data-workspace-id={workspaceId}
      style={{ display: active ? "block" : "none" }}
    >
      <Allotment ref={outerRef} separator={false}>
        {cols.map((col) => (
          <Allotment.Pane key={col.cid} minSize={140}>
            <Allotment
              vertical
              separator={false}
              ref={(r) => {
                innerRefs.current.set(col.cid, r);
              }}
            >
              {col.panes.map((pid) => (
                <Allotment.Pane key={pid} minSize={80}>
                  <Terminal
                    id={pid}
                    initialCwd={paneCwds[pid]}
                    accent={accent}
                    solidBg={solidTerminal}
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                    active={active}
                    focused={active && pid === focusedPaneId}
                    maximized={pid === maximizedPaneId}
                    onFocus={() => onFocusPane(pid)}
                    onClose={() => onClosePane(pid)}
                    onToggleMaximize={() => onToggleMaximize(pid)}
                    onMovePane={onMovePane}
                    onCwdChange={onPaneCwd}
                    resolveDropEdge={resolveDropEdge}
                  />
                </Allotment.Pane>
              ))}
            </Allotment>
          </Allotment.Pane>
        ))}
      </Allotment>
    </div>
  );
}
