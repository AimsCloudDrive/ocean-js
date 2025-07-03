import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";

export default defineConfig({
  plugins: [
    {
      name: "add-import-msom",
      transform(code) {
        // const jsxHandle = "Msom.createElement";
        // const jsxHandleImport = 'import * as Msom from "@msom/dom";';
        // if (code.includes(jsxHandle) && !code.includes(jsxHandleImport)) {
        //   const replaced = "#!/usr/bin/env node";
        //   if (code.startsWith(replaced)) {
        //     code = code.replace(
        //       replaced + "\n\n",
        //       replaced + "\n\n" + jsxHandleImport + "\n"
        //     );
        //   } else {
        //     code = jsxHandleImport + "\n" + code;
        //   }
        // }
        return code;
      },
    },
  ],
  build: {
    external: [
      "fs",
      "jsdom",
      "path",
      "mongodb",
      "cors",
      "express",
      "url",
      "rolldown",
      "commander",
      "chalk",
      "typescript",
      /^@rollup\//,
    ],
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
        paths: {},
        declaration: false,
        declarationDir: null,
        declarationMap: false,
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
    input: "./index.html",
    output: [
      {
        sourcemap: true,
        dir: "./dist",
        format: "esm",
      },
    ],
  },
});
