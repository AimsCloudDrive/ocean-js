import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";

export default defineConfig({
  plugins: [
    {
      name: "add-import-msom",
      transform(code) {
        const jsxHandle = "Msom.createElement";
        const jsxHandleImport = 'import * as Msom from "@msom/dom";';
        if (code.includes(jsxHandle) && !code.includes(jsxHandleImport)) {
          const replaced = "#!/usr/bin/env node";
          if (code.startsWith(replaced)) {
            code = code.replace(
              replaced + "\n\n",
              replaced + "\n\n" + jsxHandleImport + "\n"
            );
          } else {
            code = jsxHandleImport + "\n" + code;
          }
        }
        return code;
      },
    },
  ],
  build: {
    external: [/^@msom\//],
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
        paths: {},
        noCheck: true,
        jsxFactory: "Msom.createElement",
        jsxImportSource: "@msom/dom",
      }),
    ],
    jsx: {
      mode: "classic",
      factory: "Msom.createElement",
      jsxImportSource: "@msom/dom",
    },
    input: "./src/index.ts",
    output: [
      {
        sourcemap: true,
        dir: "./dist",
        format: "esm",
      },
    ],
  },
});
