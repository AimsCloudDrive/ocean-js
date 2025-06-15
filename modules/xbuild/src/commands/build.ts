// src/commands/build.ts
import { RollupOptions } from "rollup";
import { LoadedXbuildConfig } from "../core/types";
import { XBuilder } from "../core/builder";
import { TypeScriptCompiler } from "../core/compiler";
import { loadConfig } from "../utils/config";
import { Logger } from "../utils/logger";

export async function buildCommand(options: { config?: string }) {
  const logger = new Logger("Build");
  try {
    let config = await loadConfig(options.config);

    // 构建模式配置
    config = {
      ...config,
      mode: "production",
      watch: false,
      serve: false,
    } as LoadedXbuildConfig;

    logger.info("Starting full build process...");

    // 步骤1: 类型检查
    await config.plugins.applyHook("beforeCheck");
    const compiler = new TypeScriptCompiler(config);
    const typeCheckSuccess = await compiler.checkTypes();
    await config.plugins.applyHook("afterCheck", typeCheckSuccess);

    if (!typeCheckSuccess) {
      logger.error("Build failed: Type checking errors found");
      process.exit(1);
    }

    // 步骤2: 生成类型声明文件
    await config.plugins.applyHook("beforeDeclaration");
    const declarationSuccess = await compiler.emitDeclarations();
    await config.plugins.applyHook("afterDeclaration", declarationSuccess);

    if (!declarationSuccess) {
      logger.error("Build failed: Declaration file generation failed");
      process.exit(1);
    }

    // 步骤3: 打包构建
    const builder = new XBuilder(config);

    const rollupOptions: RollupOptions = {
      input: config.input,
      output: config.output,
      ...(config.rollupOptions || {}),
      plugins: config.rollupOptions?.plugins || [],
    };

    await config.plugins.applyHook("beforeBuild");
    const buildSuccess = await builder.runBuild(
      rollupOptions,
      rollupOptions.output || {
        dir: "dist",
        format: "esm",
      }
    );
    await config.plugins.applyHook("afterBuild", buildSuccess);

    if (buildSuccess) {
      logger.success("Full build completed successfully");
      process.exit(0);
    } else {
      logger.error("Build failed during bundling");
      process.exit(1);
    }
  } catch (error) {
    logger.error("Error during build process:", error);
    process.exit(1);
  }
}
