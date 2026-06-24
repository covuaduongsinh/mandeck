// Shell resolution shared by the main process (PTY spawning, shell picker) and
// the preload bridge (settings default). Uses node:fs/path, so it lives apart
// from the pure settings-schema module. Keeping a single source here means the
// first pane's shell and the settings-popover default never disagree.

import fs from "node:fs";
import path from "node:path";

// Discovered Windows shells, in preference order; the first existing entry is
// the default. PowerShell 7 first, then Windows PowerShell 5 (always present),
// Git Bash if installed, then cmd.exe as a last resort.
export function windowsShellCandidates() {
  const sysRoot = process.env.SystemRoot || "C:\\Windows";
  const pf = process.env["ProgramFiles"] || "C:\\Program Files";
  const pf86 = process.env["ProgramFiles(x86)"];
  const out = [];
  const add = (p) => {
    if (p && fs.existsSync(p) && !out.includes(p)) out.push(p);
  };
  add(path.join(pf, "PowerShell", "7", "pwsh.exe"));
  add(path.join(sysRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"));
  add(path.join(pf, "Git", "bin", "bash.exe"));
  if (pf86) add(path.join(pf86, "Git", "bin", "bash.exe"));
  add(process.env.COMSPEC || path.join(sysRoot, "System32", "cmd.exe"));
  return out;
}

export function defaultShellPath() {
  if (process.platform === "win32") {
    return (
      windowsShellCandidates()[0] ||
      process.env.COMSPEC ||
      "C:\\Windows\\System32\\cmd.exe"
    );
  }
  return process.env.SHELL || "/bin/zsh";
}
