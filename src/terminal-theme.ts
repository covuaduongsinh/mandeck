import type { ITheme } from "@xterm/xterm";
import { DEFAULT_TERMINAL_THEME } from "../electron/settings-schema.mjs";

// Terminal content-layer palette (SPEC D1 xterm table). These are the only
// sanctioned color literals outside the src/styles.css token sheet — the
// terminal buffer is content, not chrome, and consumes hex values via JS so
// it stays in lockstep with the IPC reduced-transparency boolean (A1).

// At ~92% the eye already reads "transparent terminal"; fixed, no slider in v1.
const BG_GLASS = "rgba(14, 14, 20, 0.92)";
// Reduced transparency and Opaque mode both snap to solid --bg-terminal.
const BG_SOLID = "#0E0E14";

type TextPalette = Omit<
  ITheme,
  "background" | "cursor" | "cursorAccent" | "selectionBackground"
>;

// Three curated text palettes; background/cursor/selection stay shared.
// "bright" is the audited baseline (8 normal colors at 4.5:1 against
// #0E0E14). "soft" pulls overall text luminance down ~20% for night use —
// every value still clears 4.5:1. "warm" sits at soft's luminance but shifts
// the grays/whites off blue toward paper tones (less blue light at night).
const TEXT_PALETTES: Record<string, TextPalette> = {
  bright: {
    // --text-primary; always 100% opacity — never vibrant, never blended.
    foreground: "#ECECF1",
    black: "#768390",
    red: "#F85149",
    green: "#3FB950",
    yellow: "#D29922",
    blue: "#58A6FF",
    magenta: "#BC8CFF",
    cyan: "#39C5CF",
    white: "#B1BAC4",
    brightBlack: "#6E7681",
    brightRed: "#FF7B72",
    brightGreen: "#56D364",
    brightYellow: "#E3B341",
    brightBlue: "#79C0FF",
    brightMagenta: "#D2A8FF",
    brightCyan: "#56D4DD",
    brightWhite: "#F0F6FC",
  },
  soft: {
    foreground: "#C3C8D2",
    black: "#75808D",
    red: "#E25A52",
    green: "#43A654",
    yellow: "#C28E27",
    blue: "#5D99E8",
    magenta: "#AC83E8",
    cyan: "#3FB3BC",
    white: "#A2AAB6",
    brightBlack: "#67707A",
    brightRed: "#E8756C",
    brightGreen: "#52BC5F",
    brightYellow: "#CFA43E",
    brightBlue: "#73AEE8",
    brightMagenta: "#BD99E8",
    brightCyan: "#52BFC8",
    brightWhite: "#D6DBE2",
  },
  warm: {
    foreground: "#CDC5B6",
    black: "#827F74",
    red: "#DE6A55",
    green: "#5DA053",
    yellow: "#C29547",
    blue: "#6E9BD2",
    magenta: "#B08CD2",
    cyan: "#5BAFA8",
    white: "#ABA395",
    brightBlack: "#6F6D64",
    brightRed: "#E08470",
    brightGreen: "#6FB465",
    brightYellow: "#CFA85E",
    brightBlue: "#84ACD8",
    brightMagenta: "#BF9FD8",
    brightCyan: "#6FBCB5",
    brightWhite: "#DED6C5",
  },
};

export function buildTerminalTheme(
  accent: string,
  solid: boolean,
  themeId: string = DEFAULT_TERMINAL_THEME
): ITheme {
  const text = TEXT_PALETTES[themeId] ?? TEXT_PALETTES[DEFAULT_TERMINAL_THEME];
  return {
    background: solid ? BG_SOLID : BG_GLASS,
    // Workspace accent — one of the four sanctioned accent elements (A1).
    cursor: accent,
    cursorAccent: "#0E0E14",
    // Neutral selection; selection is NOT accent-tinted (D1).
    selectionBackground: "rgba(236, 236, 241, 0.18)",
    ...text,
  };
}
