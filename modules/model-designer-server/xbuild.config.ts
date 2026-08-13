import { defineConfig } from "@msom/xbuild";

export default defineConfig({
  plugins: [],
  build: {
    external: [],
    plugins: [],
    input: "./src/index.ts",
    output: [
      {
        sourcemap: false,
        dir: "./dist",
        format: "esm",
      },
    ],
  },
});
