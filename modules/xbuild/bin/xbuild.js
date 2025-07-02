#!/usr/bin/env node

// bin/xbuild.js
import path from "path";
import * as fs from "fs";

// 运行生产模式
async function runProdMode() {
  // 直接运行编译后的 JavaScript
  console.log(`⚡ 运行生产模式: `);
  import("@msom/xbuild").catch((error) => {
    console.error("❌ 执行生产入口时出错:", error);
    process.exit(1);
  });
}

// 显示帮助信息
function showHelp() {
  console.log(`
xbuild - 基于 Rolldown 的可扩展构建工具

使用方式:
  xbuild [命令] [选项]

命令:
  dev        启动开发服务器
  compile    编译项目（不生成类型文件）
  build      完整构建项目（含类型检查）

选项:
  --config <path>  指定配置文件路径
  --port <number>  指定开发服务器端口
  --dev            使用开发模式运行（直接执行TS）
  --help           显示帮助信息
  --version        显示版本信息

示例:
  xbuild dev --port 8080
  xbuild build --config xbuild.config.js
`);
}

// 显示版本信息
function showVersion() {
  try {
    const pkgPath = path.join(__dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    console.log(`xbuild v${pkg.version}`);
  } catch {
    console.log("xbuild v0.1.0");
  }
}

// 主执行函数
function main() {
  // 处理帮助和版本参数
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    showHelp();
    return;
  }

  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    showVersion();
    return;
  }
  runProdMode();
}

// 启动程序
main();
