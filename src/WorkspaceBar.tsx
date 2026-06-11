import { useEffect, useRef, useState } from "react";

export type WorkspaceSummary = {
  id: string;
  title: string;
  autoNamed: boolean;
};

type Props = {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onNew: () => void;
  onReorder: (fromId: string, toId: string) => void;
};

export function WorkspaceBar({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onClose,
  onRename,
  onNew,
  onReorder,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const chipRefs = useRef(new Map<string, HTMLDivElement | null>());

  // Reveal the active chip when it changes (covers B2's create auto-scroll).
  useEffect(() => {
    chipRefs.current
      .get(activeWorkspaceId)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeWorkspaceId, workspaces.length]);

  return (
    <div className="workspace-bar">
      {workspaces.map((ws) => {
        const active = ws.id === activeWorkspaceId;
        const editing = editingId === ws.id;
        return (
          <div
            key={ws.id}
            ref={(el) => {
              chipRefs.current.set(ws.id, el);
            }}
            className={`ws-chip${active ? " active" : ""}`}
            onClick={() => onSelect(ws.id)}
            onDoubleClick={() => setEditingId(ws.id)}
            draggable={!editing}
            onDragStart={() => {
              // A drag starting while another chip's rename editor is open
              // blurs the editor first, committing its draft (SPEC B2).
              const el = document.activeElement;
              if (el instanceof HTMLElement && el.classList.contains("ws-chip-input")) {
                el.blur();
              }
              dragId.current = ws.id;
            }}
            onDragEnd={() => {
              dragId.current = null;
            }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId.current && dragId.current !== ws.id) {
                onReorder(dragId.current, ws.id);
              }
              dragId.current = null;
            }}
          >
            {editing ? (
              <ChipRename
                initial={ws.autoNamed ? "" : ws.title}
                placeholder={ws.title}
                onCommit={(value) => {
                  onRename(ws.id, value);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <span className="ws-chip-title">
                  {ws.title || "untitled"}
                </span>
                {workspaces.length > 1 && (
                  <button
                    className="ws-chip-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(ws.id);
                    }}
                    aria-label="Close workspace"
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      <button className="ws-add" onClick={onNew} aria-label="New workspace">
        +
      </button>
    </div>
  );
}

function ChipRename({
  initial,
  placeholder,
  onCommit,
  onCancel,
}: {
  initial: string;
  placeholder: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      className="ws-chip-input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(value.trim());
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onCommit(value.trim())}
    />
  );
}
