import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "classic",
    }),
    babel({
      babelConfig: {
        plugins: [["@babel/plugin-proposal-decorators", { version: "legacy" }]],
      },
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
        },
      },
    },
  },
});
