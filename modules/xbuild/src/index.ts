#!/usr/bin/env node
export * from "./commands";
export * from "./core";
export * from "./utils";

import { program } from "commander";
import { checkCommand } from "./commands/check";
import { devCommand } from "./commands/dev";
import { buildCommand } from "./commands/build";

program
  .name("xbuild")
  .description("Extensible Rollup-based TypeScript build tool")
  .version("0.1.0");

program
  .command("check")
  .description("Run TypeScript type checking")
  .option("-c, --config <path>", "Path to config file")
  .action(async (options) => {
    await checkCommand(options);
  });

program
  .command("dev")
  .description("Start development server")
  .option("-c, --config <path>", "Path to config file")
  .option("-p, --port <number>", "Port number", "3000")
  .action(async (options) => {
    await devCommand(options);
  });

// program
//   .command("compile")
//   .description("Compile TypeScript without generating .d.ts files")
//   .option("-c, --config <path>", "Path to config file")
//   .action(async (options) => {
//     await compileCommand(options);
//   });

program
  .command("build")
  .description("Full build process with type checking and declaration files")
  .option("-c, --config <path>", "Path to config file")
  .action(async (options) => {
    await buildCommand(options);
  });

program.parse(process.argv).on("exit", (...args) => {
  console.log(...args);
});
