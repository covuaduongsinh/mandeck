import { useEffect, useRef, useState } from "react";

export type TabSummary = {
  tid: string;
  title: string;
  autoNamed: boolean;
};

type Props = {
  tabs: TabSummary[];
  activeTabId: string;
  onSelect: (tid: string) => void;
  onClose: (tid: string) => void;
  onRename: (tid: string, title: string) => void;
  onNew: () => void;
  onReorder: (fromTid: string, toTid: string) => void;
};

export function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onRename,
  onNew,
  onReorder,
}: Props) {
  const [editingTid, setEditingTid] = useState<string | null>(null);
  const dragTid = useRef<string | null>(null);

  return (
    <div className="tabbar">
      {tabs.map((tab) => {
        const active = tab.tid === activeTabId;
        const editing = editingTid === tab.tid;
        return (
          <div
            key={tab.tid}
            className={`tab${active ? " active" : ""}`}
            onClick={() => onSelect(tab.tid)}
            onDoubleClick={() => setEditingTid(tab.tid)}
            draggable={!editing}
            onDragStart={() => { dragTid.current = tab.tid; }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragTid.current && dragTid.current !== tab.tid) {
                onReorder(dragTid.current, tab.tid);
              }
              dragTid.current = null;
            }}
          >
            {editing ? (
              <TabRename
                initial={tab.autoNamed ? "" : tab.title}
                placeholder={tab.title}
                onCommit={(value) => {
                  onRename(tab.tid, value);
                  setEditingTid(null);
                }}
                onCancel={() => setEditingTid(null)}
              />
            ) : (
              <>
                <span className="tab-title">
                  {tab.title || "untitled"}
                </span>
                {tabs.length > 1 && (
                  <button
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(tab.tid);
                    }}
                    aria-label="Close tab"
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      <button className="tab-add" onClick={onNew} aria-label="New tab">
        +
      </button>
    </div>
  );
}

function TabRename({
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
      className="tab-input"
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
