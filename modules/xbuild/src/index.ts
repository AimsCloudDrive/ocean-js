#!/usr/bin/env node
export * from "./commands";
export * from "./core";
export * from "./utils";

import { program } from "commander";
import { devCommand } from "./commands/dev";
import { buildCommand } from "./commands/build";

program
  .name("xbuild")
  .description("Extensible Rollup-based TypeScript build tool")
  .version("0.1.0");

program
  .command("dev")
  .description("Start development server")
  .option("-s, --static <path>", "Path to public dir")
  .option("-c, --config <path>", "Path to config file")
  .option("-p, --port <number>", "Path to Port number, default 9999")
  .action(async (options) => {
    await devCommand({ ...options, public: options.static });
  });

program
  .command("build")
  .description("Full build process with type checking and declaration files")
  .option("-c, --config <path>", "Path to config file")
  .option("-C, --compile", "Path to compile mode")
  .action(async (options) => {
    await buildCommand(options);
  });

program.parse(process.argv).on("exit", (...args) => {
  console.log(...args);
});
