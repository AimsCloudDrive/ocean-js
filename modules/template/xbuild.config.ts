// import { defineConfig } from "@msom/xbuild";
// import dts from "@rollup/plugin-typescript";

// export default defineConfig({
//   plugins: [
//     {
//       name: "add-import-msom",
//       transform(code) {
//         if (code.includes("Msom.createElement")) {
//           code = 'import * as Msom from "@msom/dom";\n' + code;
//         }
//         return code;
//       },
//     },
//   ],
//   build: {
//     external: [/^@msom\//],
//     plugins: [
//       dts({
//         tsconfig: "./tsconfig.json",
//         sourceMap: false,
//         declaration: false,
//         declarationDir: null,
//         declarationMap: false,
//         paths: {},
//         noCheck: true,
//         jsxFactory: "Msom.createElement",
//         jsxImportSource: "@msom/dom",
//       }),
//     ],
//     jsx: {
//       mode: "classic",
//       factory: "Msom.createElement",
//       jsxImportSource: "@msom/dom",
//     },
//     input: ["./index.html"],
//   },
// });
