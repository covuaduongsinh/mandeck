# Mandeck — SPEC v0.2

> Builds on v0.1. Spike (2026-05-18) verified stack: Electron 33 + React 18 + Vite + xterm.js + allotment + node-pty. Column-fill layout (1-5 = 5 cols dọc; 6+ = min-rows-rightmost fill) works mượt.

## 1. Data model

```
Workspace { schemaVersion, windows: Window[], settings, lastWriteAt }
Window    { wid, bounds: {x,y,w,h}, tabs: Tab[], activeTabId }
Tab       { tid, title, autoNamed: boolean, cols: Col[], focusedPaneId }
Col       { cid, panes: Pane[] }
Pane      { pid, cwd, createdAt, sizeHint? }
```

PTY processes are **runtime-only** — not in `Pane`. They live in main-process map `Map<pid, IPty>`. State file stores only structure; on restore we spawn fresh PTYs (Model A in v0.1: sleep/wake survives, app quit does not).

## 2. PTY abstraction (lock now, swap later)

```ts
interface PtyBackend {
  create(opts: { id: string; cols: number; rows: number; cwd: string; env?: Record<string,string> }): Promise<{ pid: number }>;
  write(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  kill(id: string): void;
  onData(id: string, cb: (data: string) => void): () => void;
  onExit(id: string, cb: (code: number) => void): () => void;
}
```

v1: `LocalPty` (node-pty in main process, current spike).
v2: `TmuxPty` (wraps `tmux new-session -d -s mandeck-{id}`). Adds session persistence across app crash/restart for free. Renderer code unchanged.

## 3. Persistence

### 3.1 Location
`~/Library/Application Support/Mandeck/state.json`
`~/Library/Application Support/Mandeck/settings.json` (separate so a corrupt layout never blocks settings)

### 3.2 Write strategy
- Atomic: write to `state.json.tmp` → `fsync` → `rename` (POSIX atomic).
- Debounce 500ms on structural changes; **force flush** on `app.before-quit` + on window-close.
- No journal in v1. If parse fails on launch → backup as `state.json.bad-{timestamp}` and start empty.

### 3.3 Schema versioning
`schemaVersion: 1`. On mismatch:
- Forward: run migration if present, else backup-then-reset.
- Never silently truncate / drop fields.

## 4. Shell integration

### 4.1 Spawn
- `shell = process.env.SHELL || "/bin/zsh"`, args `["-l"]` (login → sources `.zprofile` + `.zshrc`).
- env additions: `TERM=xterm-256color`, `COLORTERM=truecolor`, `MANDECK=1`, `MANDECK_PID=<pty id>`.

### 4.2 cwd tracking via OSC 7
Inject a one-shot helper at session start by writing this to the PTY immediately after spawn (before user types):

```sh
precmd_mandeck() { printf '\e]7;file://%s%s\a' "$HOST" "$PWD"; }
typeset -aU precmd_functions
precmd_functions+=(precmd_mandeck)
```

Sniff `\e]7;file://...\a` in main process inside `pty.onData` listener. Extract path, update `pane.cwd`.

Fallback (no OSC 7 — e.g. bash users): poll `lsof -p <pid> | grep cwd` every 2s on focused pane only. Skip in v1.0 if zsh-only is OK; revisit.

### 4.3 Tab auto-rename rule (from v0.1 §5.2)
On `pane.cwd` change of the **focused pane** in a tab:
- If `tab.autoNamed === true` → `tab.title = basename(cwd)`.
- Else (user renamed) → no-op. **Sticky forever** until user clears the title (empty → reset autoNamed=true).

## 5. Layout (locked from spike)

### 5.1 Add pane
1. `cols.length < 5` → append new col with this pane.
2. Else → pick col with **min `panes.length`**; tie → **rightmost**. Append pane to that col.
3. New pane becomes `focused`.
4. Allotment `reset()` on outer + affected inner after the next animation frame.

### 5.2 Close pane (⌘W)
1. Remove the focused pane.
2. If its col becomes empty → drop col (cols to the right shift left).
3. New focus: **most-recently-created remaining pane** (pane id has monotonic suffix → max wins).
4. If tab has 0 panes left → close tab.
5. If window has 0 tabs left → close window.
6. If app has 0 windows → app stays alive on macOS (dock icon), `⌘N` re-opens.

### 5.3 Resize
- After every structural change → reset allotment to equal split.
- User drag → preserved until next structural change.

## 6. Window & Tab

### 6.1 Shortcuts (v1)
| Shortcut       | Action                              |
|----------------|-------------------------------------|
| ⌘N             | New pane in current tab             |
| ⌘T             | New tab in current window           |
| ⌘⇧N            | New window                          |
| ⌘D             | Split (alias for ⌘N)                |
| ⌘W             | Close focused pane (cascading)      |
| ⌘⇧W            | Close current tab                   |
| ⌘[ / ⌘]        | Prev / next tab                     |
| ⌘1..⌘9         | Jump to tab N                       |

Defer to v1.1: `⌘⇧D` "force-stack-into-current-col" (since the min-rows-rightmost rule already gives natural results).

### 6.2 Window bounds
- Save x/y/w/h on every move/resize (debounced 500ms).
- Restore on launch.
- New window via ⌘⇧N: cascade +24px offset from frontmost window. If no window yet, center on primary display.

### 6.3 Tab bar
- Native-feel rounded chips, top of window.
- Click → switch. Double-click title → rename (sets `autoNamed=false`).
- Drag to reorder (HTML5 drag or `react-dnd`; pick during M1).
- "+" button at end.
- Tab indicator: yellow dot if a pane in that tab printed bell (`\a`) — defer to v1.1.

## 7. Settings (v1)

`settings.json`:
```json
{
  "font": { "family": "ui-monospace, SF Mono, Menlo, monospace", "size": 13, "lineHeight": 1.2 },
  "theme": "dark",
  "shell": null
}
```
No settings GUI in v1.0 — file-edit only. GUI = v1.1.

## 8. Build & dev

- Dev: `npm run dev` (already wired, HMR via vite-plugin-electron).
- Production: `npm run build` → `dist/` + `dist-electron/`.
- Bundle: `electron-builder` → `.dmg`. No signing/notarization in v1 (local install only). Sign as Affitor LLC after Haynoi enrollment lands.

## 9. v1 milestones

| M  | Scope                                                                                  | Est.    |
|----|----------------------------------------------------------------------------------------|---------|
| M1 | Multi-window + tab bar (no rename yet) + all shortcuts wired                           | 1 day   |
| M2 | Persistence: state.json + settings.json, atomic write, restore on launch               | 0.5 day |
| M3 | Shell integration: OSC 7 hook injection, cwd → tab auto-rename                         | 0.5 day |
| M4 | Polish: cascade placement, ⌘1..9 jumps, empty-state, drag reorder, manual rename UX    | 0.5 day |
| M5 | Bug-fix pass + a 30-min self-test against v0.1 §5.4 (visual & layout stability)         | 0.5 day |

**Total ~3 days** from current spike to v1 dogfoodable.

## 10. Out of scope (explicit defer)

- Tmux backend (v2)
- SSH/remote/WSL
- Agent auto-launch / `mandeck:agents` from v0.1 exclusion
- File-lock / inter-agent IPC (`mandeck-lock/msg`)
- Theme switcher UI / multiple themes
- Custom keybindings UI
- Cloud sync / Wave-style AI panels
- Search across panes
- True background daemon (still Model A: app quit = panes die)

## 11. Open questions (none blocking M1)

- Q: Bash users without OSC 7? → defer; warn in README; v1.1 adds lsof fallback.
- Q: Empty-col-on-close — confirmed default: drop & shift-left.
- Q: Window with 0 tabs — confirmed default: close window.
- Q: Multi-display fullscreen — inherit Electron default; revisit only if buggy.
