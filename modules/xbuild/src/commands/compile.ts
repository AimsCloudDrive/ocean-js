// src/commands/compile.ts
import { RollupOptions } from "rollup";
import { XBuilder } from "../core/builder";
import { LoadedXbuildConfig } from "../core/types";
import { loadConfig } from "../utils/config";
import { Logger } from "../utils/logger";

export async function compileCommand(options: { config?: string }) {
  const logger = new Logger("Compile");
  try {
    let config = await loadConfig(options.config);

    // 编译模式配置
    config = {
      ...config,
      mode: "production",
      watch: false,
      serve: false,
    } as LoadedXbuildConfig;

    logger.info("Starting compilation (without declaration files)...");

    await config.plugins.applyHook("beforeCompile");

    const builder = new XBuilder(config);

    // Rollup 配置 - 编译但不生成声明文件
    const rollupOptions: RollupOptions = {
      input: config.input,
      output: config.output || {
        dir: "dist",
        format: "esm",
      },
      plugins: [
        ...[config.rollupOptions?.plugins].flat(),
        {
          name: "ts-compile-only",
          async transform(code, id) {
            if (id.endsWith(".ts") || id.endsWith(".tsx")) {
              // @ts-ignore
              const ts = await import("typescript");
              return ts.transpileModule(code, {
                compilerOptions: {
                  target: ts.ScriptTarget.ESNext,
                  module: ts.ModuleKind.ESNext,
                  jsx: ts.JsxEmit.React,
                  esModuleInterop: true,
                },
              }).outputText;
            }
          },
        },
      ],
      ...(config.rollupOptions || {}),
    };

    const success = await builder.runBuild(
      rollupOptions,
      rollupOptions.output!
    );

    await config.plugins.applyHook("afterCompile", success);

    if (success) {
      logger.success("Compilation completed successfully");
      process.exit(0);
    } else {
      logger.error("Compilation failed");
      process.exit(1);
    }
  } catch (error) {
    logger.error("Error during compilation:", error);
    process.exit(1);
  }
}
