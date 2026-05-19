import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: ["electron", "node-pty"],
              output: { entryFileNames: "main.cjs", format: "cjs" },
            },
          },
        },
      },
      preload: {
        input: "electron/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: ["electron"],
              output: { entryFileNames: "preload.cjs", format: "cjs" },
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  server: { port: 5173, strictPort: true },
});
