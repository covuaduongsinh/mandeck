// Platform-aware UI helpers for the renderer. The window's platform is exposed
// by the preload bridge (no Node access in the renderer).
export const IS_MAC = window.mandeck.platform === "darwin";

// Render a macOS chord string (e.g. "⌘⇧W", "⌘1–9") with spelled-out modifier
// names on non-mac platforms: ⌘→Ctrl, ⇧→Shift, ⌥→Alt, joined with "+".
// Returns the string unchanged on macOS so the native glyphs are kept.
export function keyChord(k: string): string {
  if (IS_MAC) return k;
  return k
    .replace(/⌘/g, "Ctrl+")
    .replace(/⇧/g, "Shift+")
    .replace(/⌥/g, "Alt+");
}

// Native file-manager name, for menu/command labels ("Reveal in <name>").
export const FILE_MANAGER = IS_MAC ? "Finder" : "File Explorer";
