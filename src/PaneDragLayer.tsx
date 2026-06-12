import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDragLayer } from "react-dnd";
import { PANE_DND_TYPE, type PaneDragItem } from "./types";
import { getOverlayHost } from "./overlay";

const GHOST_W = 280;
const GHOST_H = 180;
const SETTLE_MS = 150;
// motion-interactive (D2): JS-driven spring follow — the per-frame catch-up
// factor leaves ~1 frame of lag that reads as mass. Reduced motion tracks 1:1.
const FOLLOW = 0.55;

type Pos = { x: number; y: number };

const GhostIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1.5" width="12" height="11" rx="2.5" />
    <path d="M4 5.5l2.2 1.7L4 8.9" />
  </svg>
);

// Mini ghost pane (D2): glass-2, shadow-3, 280×180 at a static −1.5° tilt,
// rendered through the body-level overlay host on the drag-ghost layer
// (z 1000, D3 layer table). On drop/cancel the ghost fades out for 150ms.
export function PaneDragLayer() {
  const { isDragging, item, currentOffset, itemType } = useDragLayer(
    (monitor) => ({
      isDragging: monitor.isDragging(),
      item: monitor.getItem<PaneDragItem | null>(),
      currentOffset: monitor.getClientOffset(),
      itemType: monitor.getItemType(),
    })
  );

  const dragging =
    isDragging && itemType === PANE_DND_TYPE && item !== null;

  const ghostRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<Pos | null>(null);
  const targetRef = useRef<Pos | null>(null);
  const lastItemRef = useRef<PaneDragItem | null>(null);
  const [settling, setSettling] = useState<(Pos & { item: PaneDragItem }) | null>(
    null
  );

  if (dragging && currentOffset) {
    // Held near the top edge, like a card picked up by its header.
    targetRef.current = {
      x: currentOffset.x - GHOST_W / 2,
      y: currentOffset.y - 18,
    };
    lastItemRef.current = item;
  }

  // Spring-follow loop: writes the transform imperatively so the chase never
  // re-renders React per frame.
  useEffect(() => {
    if (!dragging) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let raf = 0;
    const step = () => {
      const target = targetRef.current;
      const el = ghostRef.current;
      if (target && el) {
        const prev = posRef.current ?? target;
        const next = reduced
          ? target
          : {
              x: prev.x + (target.x - prev.x) * FOLLOW,
              y: prev.y + (target.y - prev.y) * FOLLOW,
            };
        posRef.current = next;
        el.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) rotate(-1.5deg)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [dragging]);

  // Drop / cancel: keep the last frame mounted briefly so the ghost can fade
  // out (motion-snappy drop, motion-smooth cancel — both 150ms fades).
  useEffect(() => {
    if (dragging) {
      setSettling(null);
      return;
    }
    const pos = posRef.current;
    const last = lastItemRef.current;
    posRef.current = null;
    targetRef.current = null;
    lastItemRef.current = null;
    if (!pos || !last) return;
    setSettling({ ...pos, item: last });
    const t = setTimeout(() => setSettling(null), SETTLE_MS);
    return () => clearTimeout(t);
  }, [dragging]);

  const live = dragging && targetRef.current;
  if (!live && !settling) return null;

  const ghostItem = live ? (item as PaneDragItem) : settling!.item;
  const initial: Pos = live
    ? posRef.current ?? targetRef.current!
    : { x: settling!.x, y: settling!.y };

  return createPortal(
    <div className="pane-drag-layer">
      <div
        ref={ghostRef}
        className={`pane-drag-ghost${live ? "" : " settling"}`}
        style={{
          transform: `translate3d(${initial.x}px, ${initial.y}px, 0) rotate(-1.5deg)`,
          width: GHOST_W,
          height: GHOST_H,
        }}
      >
        <div className="pane-drag-ghost-header">
          <span className="pane-drag-ghost-icon" aria-hidden><GhostIcon /></span>
          <span className="pane-drag-ghost-title">{ghostItem.title}</span>
        </div>
        <div className="pane-drag-ghost-body">
          <span className="pane-drag-ghost-prompt">
            {ghostItem.title.split("@")[0] || "user"}@…
          </span>
          <span className="pane-drag-ghost-cursor" aria-hidden>▍</span>
        </div>
      </div>
    </div>,
    getOverlayHost()
  );
}
