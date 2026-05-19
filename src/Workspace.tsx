import { useEffect, useRef } from "react";
import { Allotment, type AllotmentHandle } from "allotment";
import { Terminal } from "./Terminal";
import type { Col } from "./types";

type Props = {
  tid: string;
  cols: Col[];
  focusedPaneId: string;
  active: boolean;
  onFocusPane: (pid: string) => void;
};

export function Workspace({ tid, cols, focusedPaneId, active, onFocusPane }: Props) {
  const outerRef = useRef<AllotmentHandle>(null);
  const innerRefs = useRef<Map<string, AllotmentHandle | null>>(new Map());

  const totalPanes = cols.reduce((s, c) => s + c.panes.length, 0);

  useEffect(() => {
    if (!active) return;
    const raf = requestAnimationFrame(() => {
      outerRef.current?.reset();
      innerRefs.current.forEach((ref) => ref?.reset());
    });
    return () => cancelAnimationFrame(raf);
  }, [cols.length, totalPanes, active]);

  return (
    <div
      className="workspace"
      data-tid={tid}
      style={{ display: active ? "block" : "none" }}
    >
      <Allotment ref={outerRef}>
        {cols.map((col) => (
          <Allotment.Pane key={col.cid} minSize={140}>
            <Allotment
              vertical
              ref={(r) => {
                innerRefs.current.set(col.cid, r);
              }}
            >
              {col.panes.map((pid) => (
                <Allotment.Pane key={pid} minSize={80}>
                  <Terminal
                    id={pid}
                    focused={active && pid === focusedPaneId}
                    onFocus={() => onFocusPane(pid)}
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
