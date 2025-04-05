import { defineConfig } from "vite";
import dts from "@rollup/plugin-typescript";

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      plugins: [
        dts({
          tsconfig: "./tsconfig.json",
        }) as any,
      ],
      external: /^@ocean\//,
    },
    target: ["es2015"],
    emptyOutDir: true,
    sourcemap: "inline",
    minify: false,
    outDir: "./dist",
    lib: {
      entry: ["src/index.ts"],
      name: "index.js",
      formats: ["es", "cjs"],
      fileName: (format) => {
        if (/^esm?$/.test(format)) {
          return "index.js";
        }
        return `index.${format}.js`;
      },
    },
  },
});
