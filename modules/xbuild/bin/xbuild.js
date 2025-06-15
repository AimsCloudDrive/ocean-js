#!/usr/bin/env node

// bin/xbuild.js
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// 检查是否在开发模式下运行
const isDev =
  process.argv.includes("--dev") || process.env.XBUILD_DEV === "true";

// 定义开发和生产模式的执行路径
const devEntry = path.join(__dirname, "../src/cli.ts");
const prodEntry = path.join(__dirname, "../dist/cli.js");

// 检查文件是否存在
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// 运行 TypeScript 开发模式
function runDevMode() {
  console.log(devEntry);
  if (!fileExists(devEntry)) {
    console.error(`❌ 开发入口文件未找到: ${devEntry}`);
    console.error("请确保您已安装所有依赖并位于项目根目录");
    process.exit(1);
  }

  // 使用 ts-node 运行 TypeScript 代码
  const tsNodePath = path.join(
    __dirname,
    "../node_modules/ts-node/dist/bin.js"
  );

  if (!fileExists(tsNodePath)) {
    console.error("❌ ts-node 未安装，无法运行开发模式");
    console.log("请安装开发依赖: npm install -D ts-node typescript");
    process.exit(1);
  }

  // 准备参数
  const args = [
    devEntry,
    ...process.argv.slice(2).filter((arg) => arg !== "--dev"),
  ];

  console.log(`🚀 启动开发模式: ts-node ${args.join(" ")}`);

  const child = spawn(tsNodePath, args, {
    stdio: "inherit",
    shell: true,
  });

  child.on("error", (err) => {
    console.error(`❌ 子进程错误: ${err.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

// 运行生产模式
function runProdMode() {
  if (!fileExists(prodEntry)) {
    console.error(`❌ 生产入口文件未找到: ${prodEntry}`);
    console.log("请先构建项目: npm run build");
    console.log("或使用开发模式: xbuild --dev");
    process.exit(1);
  }

  // 直接运行编译后的 JavaScript
  console.log(`⚡ 运行生产模式: ${prodEntry}`);

  try {
    require(prodEntry);
  } catch (error) {
    console.error("❌ 执行生产入口时出错:", error);
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
xbuild - 基于 Rollup 和 TypeScript 的可扩展构建工具

使用方式:
  xbuild [命令] [选项]

命令:
  check      类型安全检查
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
  xbuild check
  xbuild dev --port 8080
  xbuild build --config xbuild.config.js

开发:
  要直接运行 TypeScript 源文件（无需构建）:
  xbuild --dev dev
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

  // 根据模式执行
  if (isDev) {
    runDevMode();
  } else {
    runProdMode();
  }
}

// 启动程序
main();
