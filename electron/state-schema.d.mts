import type { PersistedState } from "../src/types";

export type RepairedState = PersistedState & { sidebarVisible: boolean };

export declare const ACCENT_HUES: string[];
export declare const DEFAULT_ACCENT: string;
export declare function assignAccentHue(
  ownedHues: string[],
  defaultAccent?: string
): string;
export declare function validateV1(doc: unknown): boolean;
export declare function validateV2(doc: unknown): doc is PersistedState;
export declare function migrateV1toV2(
  v1: unknown,
  defaultAccent?: string
): PersistedState;
export declare function repairV2(
  doc: PersistedState,
  defaultAccent?: string
): RepairedState;
