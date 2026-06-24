# Changelog

## 0.1.6 — 2026-06-24

Windows support.

- Mandeck now runs on Windows 10/11 alongside macOS. The chrome adapts per
  platform: macOS keeps the Liquid Glass vibrancy and left traffic lights;
  Windows uses an opaque surface with native min/max/close caption buttons on
  the right (painted over the 44px titlebar via `titleBarOverlay`), and hides
  the menu bar (Alt still reveals it) while keeping every Ctrl accelerator.
- Shell discovery on Windows: PowerShell 7, Windows PowerShell 5, Git Bash,
  then cmd.exe — the first found is the default, and all appear in the settings
  shell picker. PowerShell panes get per-prompt cwd tracking via an injected
  OSC 7 prompt wrapper, so header titles and workspace auto-naming work the
  same as on macOS; `file:///C:/…` URIs are converted to native `C:\…` paths.
- Keyboard map maps ⌘ → Ctrl in the UI and shortcuts panel; the macOS-only
  double-press ⌘Q confirm becomes the OS close (Alt+F4) on Windows.
- Packaging: `npm run dist:win` produces an NSIS installer and a portable
  `.exe` (x64). Builds are unsigned for now (SmartScreen will warn).
- Fix: a freshly created `settings.json` on Windows no longer seeds the shell
  field with the macOS `/bin/zsh` path — it uses the resolved platform default.

## 0.1.5 — 2026-06-12

Smarter link detection.

- ⌘+click now also opens scheme-less links: bare domains against a curated
  TLD list (`uat-dashboard.vercel.app`, `affitor.com`, `www.google.com`),
  plus `localhost:3000` and IPv4:port dev servers (opened as http://).
  File names like `main.ts`, `README.md`, or `state.json` deliberately do
  not light up, and hosts inside email addresses are ignored.
- Right-clicking a selected bare-domain link now offers Open URL with the
  normalized address.

## 0.1.4 — 2026-06-12

Terminal text themes.

- Settings → Appearance → Text theme: three curated palettes — Bright
  (the audited baseline), Soft (text luminance pulled down ~20% for night
  use), and Warm (soft luminance plus paper-toned whites, less blue light).
  Live-applies to every open pane; persisted in settings.json as
  `terminalTheme`. All palette values clear 4.5:1 against the terminal
  background.

## 0.1.3 — 2026-06-11

Resize correctness.

- Live drag no longer storms the shell with resize events: xterm re-fits
  every frame (visual stays smooth), but the PTY receives exactly one
  SIGWINCH per gesture, at the final size. Fixes duplicated/garbled output
  from TUI apps (Claude Code and other ink-based UIs) when resizing the
  window or pane splitters mid-stream.
- PTY resize dims are clamped to sane integers and failures are logged
  instead of silently swallowed, so a PTY can no longer get stranded at a
  stale size.

## 0.1.2 — 2026-06-11

Pane variety and faster theming.

- File-browser pane type: browse directories inline with navigation and
  context actions.
- Accent swatches now recolor the current workspace immediately.
- Keyboard-shortcuts panel on ⌘/.

## 0.1.1 — 2026-06-11

Navigation and workflow polish on top of the Glass redesign.

- Command palette (⌘K): fuzzy-searchable actions for panes, workspaces,
  and settings from anywhere in the app.
- Open Folder (⌘O): pick a directory and spawn a pane already cd'd there.
- Rail files popover: cwd at a glance plus a recent-folders list for
  one-click reopening.
- Settings pickers expanded, including accent swatches for per-workspace
  hues.
- Abbreviated pane titles keep headers readable in narrow panes.
- Pane-header context menu with Move to Workspace.

## 0.1.0 — 2026-06-11 "Glass"

The redesign release. The whole chrome moved to a Liquid Glass design
system while the terminal core stayed untouched.

- Workspaces replace tabs as the top of the hierarchy: named chips in the
  titlebar, per-workspace accent hues, auto-naming from the focused pane's
  cwd, instant lossless switching.
- State schema v2 with a safe v1 migration: timestamped backup before any
  write, atomic fsync'd saves, quit-time flush, corruption recovery.
- Liquid Glass chrome: design-token sheet, under-window vibrancy, glass
  titlebar and pane headers, glass drag ghost and drop wash, maximize
  spotlight as a body-level portal, reduced-transparency fallbacks.
- Utility rail with terminal launcher and settings popover backed by
  settings.json; font changes live-apply without restarting shells.
- xterm.js switched to the WebGL renderer with themed palette.
- Layered Liquid Glass app icon compiled from a hand-authored .icon
  package via actool, with .icns fallback.

## 0.0.1 — 2026-05-19

Initial from-scratch build: multi-tab terminal with tiled panes (up to five
columns), pane drag-rearrange, maximize spotlight, ⌘Q double-press confirm,
session persistence with OSC 7 cwd tracking, file-drop staging, and
⌘+click link opening.
