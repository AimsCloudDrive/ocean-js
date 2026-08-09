import { basename } from "node:path";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { defineConfig } from "@msom/xbuild";


function emitDtsTree() {
  return {
    name: "emit-dts-tree",
    closeBundle() {
      const cwd = process.cwd();
      const pkgDirName = basename(cwd);
      const tmpDir = resolve(cwd, "dist2/.dts-tmp");
      const typesDir = resolve(cwd, "dist2/types");

      if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
      if (existsSync(typesDir)) rmSync(typesDir, { recursive: true, force: true });
      mkdirSync(tmpDir, { recursive: true });

      try {
        execSync(
          [
            "tsc",
            "-p ./tsconfig-xbuild.json",
            "--emitDeclarationOnly",
            "--declaration",
            "--noEmitOnError false",
            "--skipLibCheck",
            "--rootDir ../..",
            `--outDir "${tmpDir}"`,
          ].join(" "),
          { stdio: ["ignore", "pipe", "pipe"], cwd },
        );
      } catch (tscErr) {
        console.warn("[emit-dts-tree] tsc 遇到问题（可能是源代码类型错误，继续复制已生成的d.ts）：", (tscErr as Error).message);
      }

      const srcRoot = resolve(tmpDir, "modules", pkgDirName, "src");
      if (existsSync(srcRoot)) {
        cpSync(srcRoot, typesDir, { recursive: true });
      } else {
        console.warn("[emit-dts-tree] 未找到临时类型目录 " + srcRoot + "，跳过复制");
      }
      const mainEntry = resolve(cwd, pkgDirName === "xbuild" ? "dist2/index.d.ts" : "dist/index.d.ts");
      writeFileSync(mainEntry, '/// <reference path="./types/index.d.ts" />\nexport * from "./types/index.js";\n', "utf8");
      rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [],
  build: {
    external: ["tslib", /^@msom\/(?!common$|http$)/, /^@rollup\//],
    plugins: [emitDtsTree()],
    jsx: {
      mode: "automatic",
      jsxImportSource: "@msom/dom",
    },
    input: "./src/index.ts",
    output: [
      {
        sourcemap: false,
        dir: "./dist2",
        format: "esm",
        entryFileNames: () => "index.js",
        chunkFileNames: () => "shared.js",
      },
    ],
  },
  dev: {
    proxy: {
      "/api": { target: "http://localhost", changeOrigin: true },
      "/dasfabjdsads": { target: "http://localhost" },
    },
  },
});
