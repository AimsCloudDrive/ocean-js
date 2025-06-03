#!/usr/bin/env node
// @ts-nocheck
import chalk from "chalk";
import { execSync, spawn } from "child_process";
import fs from "fs";
import os from "os";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { SuperTaskController } from "./SuperTaskController.js";

// 基础配置
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MODULES_DIR = "modules";

/**
 * 命令配置
 * @typedef {{
  build: {
    aliases: ["-b", "--build"],
    script: "build",
    description: "构建项目",
  },
  check: {
    aliases: ["-c", "--check"],
    script: "check",
    description: "代码检查",
  },
  release: {
    aliases: ["-r", "--release"],
    script: "release",
    description: "发布包",
  },
}}
 */
const COMMANDS = {
  build: {
    aliases: ["-b", "--build"],
    script: "build",
    description: "构建项目",
  },
  check: {
    aliases: ["-c", "--check"],
    script: "check",
    description: "代码检查",
  },
  release: {
    aliases: ["-r", "--release"],
    script: "release",
    description: "发布包",
  },
};

/**
 * 环境预检
 * @returns {boolean}
 */
function checkPnpmExists() {
  try {
    execSync("pnpm --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// 参数预处理
/**
 *
 * @returns {{command: keyof typeof COMMANDS, args: string[]}}
 */
function preprocessArguments() {
  const rawArgs = process.argv.slice(2);

  // 检测并移除 pnpm 添加的冗余命令副本
  const firstArg = rawArgs[0] || "";
  const isPnpmStyle = Object.keys(COMMANDS).includes(firstArg);

  return {
    command: isPnpmStyle ? firstArg : null,
    args: isPnpmStyle ? rawArgs.slice(1) : rawArgs,
  };
}

/**
 * 解析有效命令
 * @param {string[]} args
 * @returns {{command: keyof typeof COMMANDS, packages: string[], parallel: boolean}}
 */
function parseCommand(args) {
  let targetCommand = null;
  let parallel = false;
  const packages = [];
  const commandAliasMap = {
    b: "build",
    c: "check",
    r: "release",
  };

  // 处理组合参数和独立参数
  const expandArgs = [];
  for (const arg of args) {
    if (/^-[bcrp]+$/.test(arg)) {
      // 处理组合短参数
      const flags = arg.slice(1).split("");
      flags.forEach((f) => expandArgs.push(`-${f}`));
    } else {
      expandArgs.push(arg);
    }
  }

  // 实际解析逻辑
  for (const arg of expandArgs) {
    if (arg.startsWith("-")) {
      // 处理命令参数
      if (["-b", "-c", "-r", "--build", "--check", "--release"].includes(arg)) {
        const currentCommand =
          commandAliasMap[arg.replace(/-/g, "")] || arg.slice(2);
        if (targetCommand) {
          console.log(
            chalk.red(
              `❌ 检测到多个命令参数: ${targetCommand} 和 ${currentCommand}`
            )
          );
          process.exit(1);
        }
        targetCommand = currentCommand;
      }
      // 处理并行参数
      else if (["-p", "--parallel"].includes(arg)) {
        parallel = true;
      }
      // 未知参数
      else {
        console.log(chalk.red(`❌ 未知参数: ${arg}`));
        process.exit(1);
      }
    } else {
      packages.push(arg);
    }
  }

  // 验证必须存在命令参数
  if (!targetCommand) {
    console.log(chalk.red("❌ 必须指定一个有效命令："));
    showCommandHelp();
    process.exit(1);
  }

  return { command: targetCommand, packages, parallel };
}

/**
 * 验证包有效性
 * @param {string[]} packageNames
 * @returns {{valid: string[], invalid: string[]}}
 */
function validatePackages(packageNames) {
  const valid = [];
  const invalid = [];

  packageNames.forEach((pkg) => {
    const packagePath = resolve(__dirname, "..", MODULES_DIR, pkg);
    if (fs.existsSync(packagePath)) {
      valid.push(pkg);
    } else {
      invalid.push(pkg);
    }
  });

  return { valid, invalid };
}

/**
 *
 * @param {keyof typeof COMMANDS} command
 * @param {string[]} packages
 * @param {boolean} parallel
 * @returns {Promise<void>}
 */
async function executeCommand(command, packages, parallel) {
  const MODULES_PATH = resolve(__dirname, "..", MODULES_DIR);

  // 获取实际要构建的包列表
  let targetPackages =
    packages.length > 0 ? packages : getAllValidPackages(MODULES_PATH);

  if (!parallel) {
    // 原有串行逻辑
    const filter =
      targetPackages.length > 0
        ? targetPackages.length > 1
          ? `{${targetPackages.join(",")}}`
          : `${targetPackages.join(",")}`
        : `*`;

    try {
      execSync(`pnpm run -r --filter=./${MODULES_DIR}/${filter} ${command}`, {
        stdio: "inherit",
      });
      return true;
    } catch {
      return false;
    }
  }

  // 并行逻辑
  return runParallelBuild(targetPackages, command);
}

/**
 * 获取所有有效包
 * @param {string} modulesPath
 * @returns {string[]}
 */
function getAllValidPackages(modulesPath) {
  try {
    const entries = fs.readdirSync(modulesPath, { recursive: false });
    return entries.filter(async (entry) => {
      const stat = fs.statSync(resolve(modulesPath, entry));
      return stat.isDirectory();
    });
  } catch (error) {
    console.error(chalk.red("读取模块目录失败:"), error);
    return [];
  }
}

/**
 * 并行构建核心逻辑
 * @param {string[]} packages
 * @param {keyof typeof COMMANDS} command
 * @returns {Promise<void>}
 */
async function runParallelBuild(packages, command) {
  const concurrency = Math.max(1, os.cpus().length - 1); // 留出一个核心
  let finished = 0;
  let hasError = false;

  console.log(chalk.blue(`启动并行构建 (最大并发数: ${concurrency})`));

  const controller = new SuperTaskController({
    accompanyingCount: concurrency,
  });
  return new Promise((resolve, reject) => {
    packages.forEach((pkg) => {
      controller
        .addTask(() => {
          if (hasError) return;
          console.log(chalk.gray(`🏗️  开始构建: ${pkg}`));
          return runSinglePackageBuild(pkg, command).then(
            () => {
              console.log(chalk.green(`✅ ${pkg} 构建成功`));
            },
            (error) => {
              hasError = true;
              console.log(chalk.red(`❌ ${pkg} 构建失败:`), error.message);
              reject(false);
            }
          );
        })
        .finally(() => {
          finished++;
          if (finished === packages.length) {
            resolve(true);
          }
        });
    });
  });
}

// 执行单个包构建
/**
 *
 * @param {string} pkg
 * @param {keyof typeof COMMANDS} command
 * @returns {Promise<void>}
 */
function runSinglePackageBuild(pkg, command) {
  const pnpmBinary = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

  const args = ["run", "--filter", `./${MODULES_DIR}/${pkg}`, command];

  console.log(chalk.gray(`执行命令: ${pnpmBinary} ${args.join(" ")}`));

  return new Promise((resolve, reject) => {
    const child = spawn(pnpmBinary, args, {
      stdio: "inherit",
      shell: true,
      windowsHide: true,
    });

    child.on("error", (error) => {
      console.log(chalk.red(`子进程启动失败: ${error.message}`));
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`进程退出码: ${code}`));
      }
    });
  });
}

// 主流程
async function main() {
  if (!checkPnpmExists()) {
    console.log(chalk.red("❌ 检测到 pnpm 未安装"));
    console.log(chalk.yellow("请先执行: npm install -g pnpm"));
    process.exit(1);
  }
  try {
    // 参数预处理
    const { command: pnpmCommand, args } = preprocessArguments();

    // 命令解析
    const { command, packages, parallel } = pnpmCommand
      ? { command: pnpmCommand, ...parseCommand(args) }
      : parseCommand(args);

    // 包验证
    const { valid, invalid } = validatePackages(packages);

    // 输出警告
    if (invalid.length > 0) {
      console.log(chalk.yellow(`⚠  忽略无效包: ${invalid.join(", ")}`));
    }

    // 执行逻辑
    if (valid.length > 0 || packages.length === 0) {
      console.log(chalk.blue(`🚀 开始 ${command} 操作`));
      console.log(
        chalk.cyan(`📦 目标包: ${valid.length ? valid.join(", ") : "全部"}`)
      );
      if (parallel) console.log(chalk.magenta("⚡ 并行模式已启用"));

      executeCommand(COMMANDS[command].script, valid, parallel).then(
        () => {
          console.log(chalk.green(`✅ ${command} 操作完成`));
        },
        () => {
          console.log(chalk.red(`❌ ${command} 操作失败`));
          process.exit(1);
        }
      );
    } else {
      console.log(chalk.red("❌ 没有找到有效包"));
      process.exit(1);
    }
  } catch (error) {
    console.log(chalk.red("🛑 发生未预期错误:"));
    console.error(error);
    process.exit(1);
  }
}

// 启动程序
main();
