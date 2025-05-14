import path from "path";
import { fileURLToPath } from "url";

const viteRollupBabelPlugins = [
  ["@babel/plugin-proposal-decorators", { version: "legacy" }],
  // [
  //   path.resolve(
  //     fileURLToPath(import.meta.url),
  //     "..",
  //     "babel-plugins/decorator.js"
  //   ),
  //   { version: "legacy" },
  // ],
];

export default viteRollupBabelPlugins;
