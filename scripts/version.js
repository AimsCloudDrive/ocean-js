#!/usr/bin/env node
// @ts-nocheck
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import semver from "semver";

// 获取当前文件路径（ESM 替代 __dirname 方案）
const __filename = fileURLToPath(import.meta.url);

// 参数映射表
const PARAM_MAP = new Map([
  ["--major", "major"],
  ["-M", "major"],
  ["--minor", "minor"],
  ["-m", "minor"],
  ["--patch", "patch"],
  ["-p", "patch"],
]);

// 解析命令行参数
const [inputArg] = process.argv.slice(2);

// 参数验证
if (!inputArg || !PARAM_MAP.has(inputArg)) {
  console.error("Error: 必须提供且只能提供一个有效版本参数");
  console.log("可用参数:");
  PARAM_MAP.forEach((value, key) => {
    if (key.startsWith("-")) {
      console.log(`  ${key.padEnd(8)} → 更新 ${value} 版本号`);
    }
  });
  process.exit(1);
}

// 主执行逻辑
try {
  // 获取执行目录的 package.json
  const currentDir = process.cwd();
  const pkgPath = path.join(currentDir, "package.json");

  // 验证文件存在性
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`找不到 package.json（当前目录: ${currentDir}）`);
  }

  // 读取并解析 package.json
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  // 验证版本号格式
  if (!semver.valid(pkg.version)) {
    throw new Error(`无效的语义化版本号: ${pkg.version}`);
  }

  // 生成新版本号
  const versionType = PARAM_MAP.get(inputArg);
  const newVersion = semver.inc(pkg.version, versionType);
  if (!newVersion) throw new Error("版本号增量失败");

  // 保留缩进格式写入
  const updatedContent =
    JSON.stringify({ ...pkg, version: newVersion }, null, 2) + "\n";
  fs.writeFileSync(pkgPath, updatedContent, "utf8");

  console.log(
    `📦 子包路径: ${path.relative(process.cwd(), currentDir) || "."}`
  );
  console.log(`🆕 版本更新: ${pkg.version} → ${newVersion}`);
} catch (error) {
  console.error(`❌ 错误: ${error.message}`);
  process.exit(1);
}
