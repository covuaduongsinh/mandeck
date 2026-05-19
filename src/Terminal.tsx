import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { MandeckApi } from "../electron/preload";

declare global {
  interface Window { mandeck: MandeckApi }
}

type Props = {
  id: string;
  focused: boolean;
  onFocus: () => void;
};

export function Terminal({ id, focused, onFocus }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new XTerm({
      fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      allowProposedApi: true,
      theme: {
        background: "#0e1116",
        foreground: "#e6edf3",
        cursor: "#2f81f7",
        black: "#0e1116",
        red: "#f85149",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#b1bac4",
        brightBlack: "#6e7681",
        brightRed: "#ff7b72",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    try { fit.fit(); } catch { /* noop */ }

    termRef.current = term;
    fitRef.current = fit;

    let disposed = false;
    let offData = () => {};
    let offExit = () => {};

    const { cols, rows } = term;
    window.mandeck
      .createPty({ id, cols, rows })
      .then(() => {
        if (disposed) {
          window.mandeck.kill(id);
          return;
        }
        offData = window.mandeck.onData(id, (data) => {
          if (!disposed) term.write(data);
        });
        offExit = window.mandeck.onExit(id, () => {
          if (!disposed) term.write("\r\n[process exited]\r\n");
        });
        term.focus();
      })
      .catch((err) => console.error("createPty failed", err));

    const inputDisp = term.onData((data) => {
      window.mandeck.write(id, data);
    });
    const resizeDisp = term.onResize(({ cols, rows }) => {
      window.mandeck.resize(id, cols, rows);
    });

    const ro = new ResizeObserver(() => {
      try { fit.fit(); } catch { /* not ready */ }
    });
    ro.observe(host);

    const mouseDown = () => {
      onFocus();
      term.focus();
    };
    host.addEventListener("mousedown", mouseDown);

    return () => {
      disposed = true;
      ro.disconnect();
      host.removeEventListener("mousedown", mouseDown);
      inputDisp.dispose();
      resizeDisp.dispose();
      offData();
      offExit();
      window.mandeck.kill(id);
      try { term.dispose(); } catch { /* noop */ }
      termRef.current = null;
      fitRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    if (focused) {
      termRef.current?.focus();
      try { fitRef.current?.fit(); } catch { /* noop */ }
    }
  }, [focused]);

  return (
    <div className={`pane ${focused ? "focused" : ""}`}>
      <div ref={hostRef} className="xterm-container" />
    </div>
  );
}
