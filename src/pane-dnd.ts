// Shared pane drop-target behavior (D2), extracted verbatim from Terminal so
// the file-browser pane is the same grid citizen: accepts pane drags with the
// half-of-target edge hit-test (cap fallback resolved up front so the wash
// never shows a half that lies) and native file drags (INV-5) when the view
// supplies a file handler — views without one still register the FILE type so
// a stray drop dies quietly instead of navigating the window.
import { useCallback, useEffect, useState, type RefObject } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { PANE_DND_TYPE, type Edge, type PaneDragItem } from "./types";

function edgeFromOffset(x: number, y: number, w: number, h: number): Edge {
  const nx = x / w - 0.5; // -0.5 .. 0.5
  const ny = y / h - 0.5;
  if (Math.abs(nx) > Math.abs(ny)) {
    return nx < 0 ? "left" : "right";
  }
  return ny < 0 ? "top" : "bottom";
}

type Options = {
  id: string;
  bodyRef: RefObject<HTMLDivElement | null>;
  resolveDropEdge: (srcPid: string, edge: Edge) => Edge;
  onMovePane: (src: string, target: string, edge: Edge) => void;
  onFileDrop?: (files: File[]) => void;
};

export function usePaneDropTarget({
  id,
  bodyRef,
  resolveDropEdge,
  onMovePane,
  onFileDrop,
}: Options) {
  const [hoverEdge, setHoverEdge] = useState<Edge | null>(null);

  const computeEdge = useCallback(
    (clientX: number, clientY: number): Edge | null => {
      const rect = bodyRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return edgeFromOffset(
        clientX - rect.left,
        clientY - rect.top,
        rect.width,
        rect.height
      );
    },
    [bodyRef]
  );

  const [{ isOver, draggedPid, hoveringType }, dropRef] = useDrop<
    PaneDragItem | { files: File[] },
    void,
    {
      isOver: boolean;
      draggedPid: string | null;
      hoveringType: string | symbol | null;
    }
  >(
    () => ({
      accept: [PANE_DND_TYPE, NativeTypes.FILE],
      hover: (_item, monitor) => {
        if (monitor.getItemType() !== PANE_DND_TYPE) {
          if (hoverEdge !== null) setHoverEdge(null);
          return;
        }
        const item = monitor.getItem() as PaneDragItem;
        if (item.pid === id) {
          setHoverEdge(null);
          return;
        }
        const offset = monitor.getClientOffset();
        if (!offset) return;
        // Resolve the cap fallback up front so the wash shows the half that
        // will actually be used (D2 §7).
        const raw = computeEdge(offset.x, offset.y);
        const edge = raw ? resolveDropEdge(item.pid, raw) : raw;
        if (edge !== hoverEdge) setHoverEdge(edge);
      },
      drop: (_item, monitor) => {
        const type = monitor.getItemType();
        if (type === NativeTypes.FILE) {
          const payload = monitor.getItem() as { files?: File[] };
          if (payload?.files?.length && onFileDrop) onFileDrop(payload.files);
          return;
        }
        const paneItem = monitor.getItem() as PaneDragItem;
        if (paneItem.pid === id) return;
        const offset = monitor.getClientOffset();
        const raw = offset ? computeEdge(offset.x, offset.y) : hoverEdge;
        const edge = raw ? resolveDropEdge(paneItem.pid, raw) : raw;
        if (edge) onMovePane(paneItem.pid, id, edge);
        setHoverEdge(null);
      },
      collect: (m) => ({
        isOver: m.isOver({ shallow: true }),
        draggedPid:
          m.getItemType() === PANE_DND_TYPE
            ? ((m.getItem() as PaneDragItem | null)?.pid ?? null)
            : null,
        hoveringType: m.isOver({ shallow: true }) ? m.getItemType() : null,
      }),
    }),
    [id, computeEdge, hoverEdge, onMovePane, onFileDrop, resolveDropEdge]
  );

  useEffect(() => {
    if (!isOver) setHoverEdge(null);
  }, [isOver]);

  const dropIsSelf = draggedPid === id;
  // The file-hover wash only shows when this view can actually take the drop.
  const fileHover =
    isOver && hoveringType === NativeTypes.FILE && onFileDrop !== undefined;

  return { dropRef, isOver, hoverEdge, dropIsSelf, fileHover };
}
