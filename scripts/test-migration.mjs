#!/usr/bin/env node
// Migration acceptance test (SPEC B3, mandatory gate). Plain node, no deps.
// Exercises the exact production load path (electron/state-file.mjs +
// electron/state-schema.mjs) against:
//   (a) a synthetic v1 fixture,
//   (b) a COPY of any real v1 state.json found under ~/Library/Application
//       Support (the original is never touched),
//   (c) the Journey 5 corruption path (bad backup + fresh default),
//   (d) an invalid-v1 file (bad backup + fresh default).
// Asserts: backup byte-identity, zero data loss (B3's 4-point test),
// round-trip stability, untouched backups.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { loadStateFile, writeStateFile } from "../electron/state-file.mjs";
import {
  ACCENT_HUES,
  DEFAULT_ACCENT,
  assignAccentHue,
  repairV2,
  validateV2,
} from "../electron/state-schema.mjs";

let passed = 0;
const results = [];

function ok(label) {
  passed++;
  results.push(`  PASS  ${label}`);
}

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mandeck-migration-"));
}

function expectedHueSequence(n) {
  const owned = [];
  for (let i = 0; i < n; i++) owned.push(assignAccentHue(owned, DEFAULT_ACCENT));
  return owned;
}

function backupsIn(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.includes(".v1-backup-") || f.includes(".bad-"));
}

// ---------------------------------------------------------------------------
function assertMigration(v1Doc, rawV1, label) {
  const dir = tmpdir();
  const file = path.join(dir, "state.json");
  fs.writeFileSync(file, rawV1);

  const res = loadStateFile(file);
  assert.equal(res.source, "migrated", `${label}: decision table picked migrate`);

  // Gate 1 — timestamped backup exists, byte-identical to the v1 original,
  // written before any v2 write (state.json itself is still the v1 bytes).
  assert.ok(res.backupPath, `${label}: backup path returned`);
  assert.match(path.basename(res.backupPath), /^state\.json\.v1-backup-/);
  assert.equal(fs.readFileSync(res.backupPath, "utf8"), rawV1);
  assert.equal(fs.readFileSync(file, "utf8"), rawV1);
  ok(`${label}: byte-identical state.json.v1-backup-<ts> written before any v2 write`);

  // Gate 2 — zero data loss: every tab becomes a workspace, same count,
  // order, ids, titles, autoNamed, structure, focus, maximize; active tab is
  // the active workspace; paneCwds carried unmodified; accentHue is the only
  // added field, assigned in array order by the B1 scan.
  const v2 = res.state;
  assert.equal(v2.version, 2);
  assert.equal(v2.workspaces.length, v1Doc.tabs.length);
  v1Doc.tabs.forEach((t, i) => {
    const w = v2.workspaces[i];
    assert.equal(w.id, t.tid, `${label}: ws[${i}] keeps id ${t.tid}`);
    assert.equal(w.title, t.title);
    assert.equal(w.autoNamed, t.autoNamed);
    assert.deepEqual(w.cols, t.cols);
    assert.equal(w.focusedPaneId, t.focusedPaneId);
    assert.equal(w.maximizedPaneId, t.maximizedPaneId ?? null);
    assert.deepEqual(Object.keys(w).sort(), [
      "accentHue",
      "autoNamed",
      "cols",
      "focusedPaneId",
      "id",
      "maximizedPaneId",
      "title",
    ]);
    assert.ok(ACCENT_HUES.includes(w.accentHue));
  });
  assert.deepEqual(
    v2.workspaces.map((w) => w.accentHue),
    expectedHueSequence(v1Doc.tabs.length)
  );
  assert.equal(v2.activeWorkspaceId, v1Doc.activeTabId);
  assert.deepEqual(v2.paneCwds, v1Doc.paneCwds ?? {});
  assert.deepEqual(Object.keys(v2).sort(), [
    "activeWorkspaceId",
    "paneCwds",
    "version",
    "workspaces",
  ]);
  ok(`${label}: zero data loss (${v1Doc.tabs.length} tab(s) → workspaces, ids/titles/structure/focus/maximize/paneCwds intact, accentHue only addition)`);

  // Gate 3 is the visual/layout gate (manual, runs in the app). Structural
  // equivalent here: workspace #1 carries v1 tab #1's exact cols verbatim.
  assert.deepEqual(v2.workspaces[0].cols, v1Doc.tabs[0].cols);

  // Gate 4 — round-trip stability: simulate the renderer hydrate (validate +
  // repair) and the first save, then re-load; the state must be identical
  // and the backup untouched.
  assert.ok(validateV2(v2), `${label}: migrated doc passes v2 validation`);
  const hydrated = repairV2(v2, DEFAULT_ACCENT);
  assert.deepEqual(
    hydrated.workspaces,
    v2.workspaces,
    `${label}: hydration repair is a no-op on a clean migration`
  );
  writeStateFile(file, hydrated);
  const res2 = loadStateFile(file);
  assert.equal(res2.source, "v2", `${label}: second load hydrates directly`);
  assert.deepEqual(res2.state, hydrated);
  assert.deepEqual(repairV2(res2.state, DEFAULT_ACCENT), hydrated);
  assert.equal(fs.readFileSync(res.backupPath, "utf8"), rawV1);
  assert.equal(backupsIn(dir).length, 1, `${label}: no extra backups created`);
  ok(`${label}: round-trip stable; backup untouched after first v2 save`);

  return v2;
}

// (a) Synthetic v1 fixture: 3 tabs, multi-column, maximize state, manual
// rename, populated paneCwds, second tab active.
const syntheticV1 = {
  version: 1,
  tabs: [
    {
      tid: "t1",
      title: "kyma-api",
      autoNamed: true,
      cols: [
        { cid: "c1", panes: ["p1", "p2"] },
        { cid: "c2", panes: ["p3"] },
      ],
      focusedPaneId: "p3",
      maximizedPaneId: null,
    },
    {
      tid: "t2",
      title: "deploys",
      autoNamed: false,
      cols: [{ cid: "c3", panes: ["p4"] }],
      focusedPaneId: "p4",
      maximizedPaneId: "p4",
    },
    {
      tid: "t5",
      title: "shell",
      autoNamed: true,
      cols: [
        { cid: "c4", panes: ["p5"] },
        { cid: "c6", panes: ["p7", "p9"] },
      ],
      focusedPaneId: "p9",
      maximizedPaneId: null,
    },
  ],
  activeTabId: "t2",
  paneCwds: {
    p1: "/Users/sonpiaz/kyma-api",
    p2: "/Users/sonpiaz/kyma-api/workers",
    p3: "/Users/sonpiaz",
    p4: "/Users/sonpiaz/mandeck",
    p5: "/",
    p7: "/Users/sonpiaz/Affitor-main",
    p9: "/Users/sonpiaz",
  },
};
assertMigration(syntheticV1, JSON.stringify(syntheticV1), "synthetic v1");

// (b) Real v1 state files: scan userData dirs READ-ONLY, test against copies.
const appSupport = path.join(os.homedir(), "Library", "Application Support");
const realFiles = [];
try {
  for (const entry of fs.readdirSync(appSupport)) {
    const candidate = path.join(appSupport, entry, "state.json");
    try {
      const raw = fs.readFileSync(candidate, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.tabs)) {
        realFiles.push({ origin: candidate, raw, parsed });
      }
    } catch {
      /* no state.json here, unreadable, or not ours — skip */
    }
  }
} catch {
  /* Application Support unreadable — synthetic coverage stands */
}
if (realFiles.length === 0) {
  results.push("  SKIP  no real v1 state.json found under ~/Library/Application Support");
}
for (const { origin, raw, parsed } of realFiles) {
  const before = fs.statSync(origin).mtimeMs;
  assertMigration(parsed, raw, `real v1 copy (${origin})`);
  assert.equal(fs.statSync(origin).mtimeMs, before, "original file untouched");
  assert.equal(fs.readFileSync(origin, "utf8"), raw, "original bytes untouched");
  ok(`real v1 copy (${origin}): original never modified`);
}

// (c) Journey 5 corruption path: bad file → timestamped bad-copy backup plus
// fresh default, never a silent overwrite.
{
  const dir = tmpdir();
  const file = path.join(dir, "state.json");
  const garbage = '{"version":1,"tabs":[{"tid":'; // truncated JSON
  fs.writeFileSync(file, garbage);
  const res = loadStateFile(file);
  assert.equal(res.state, null);
  assert.equal(res.source, "fresh");
  assert.match(path.basename(res.backupPath), /^state\.json\.bad-/);
  assert.equal(fs.readFileSync(res.backupPath, "utf8"), garbage);
  assert.equal(fs.readFileSync(file, "utf8"), garbage, "load never rewrites state.json");
  ok("corrupted file: state.json.bad-<ts> backup + fresh default, no silent overwrite");
}

// (d) version 1 but failing the field-by-field validation → bad backup +
// fresh default.
{
  const dir = tmpdir();
  const file = path.join(dir, "state.json");
  const invalid = JSON.stringify({ version: 1, tabs: [], activeTabId: "t1" });
  fs.writeFileSync(file, invalid);
  const res = loadStateFile(file);
  assert.equal(res.state, null);
  assert.equal(res.source, "fresh");
  assert.match(path.basename(res.backupPath), /^state\.json\.bad-/);
  assert.equal(fs.readFileSync(res.backupPath, "utf8"), invalid);
  ok("invalid v1 shape: bad backup + fresh default");
}

// (e) Missing file → fresh default, no backup.
{
  const dir = tmpdir();
  const res = loadStateFile(path.join(dir, "state.json"));
  assert.equal(res.state, null);
  assert.equal(res.source, "fresh");
  assert.equal(res.backupPath, null);
  ok("missing file: fresh default, no backup");
}

console.log("Migration acceptance test (SPEC B3)\n");
for (const line of results) console.log(line);
console.log(`\n${passed} assertions groups passed.`);
