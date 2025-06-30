// src/commands/build.ts
import { XBuilder } from "../core/builder";
import { TypeScriptCompiler } from "../core/compiler";
import { XBuildContext } from "../core/types";
import { loadConfig } from "../utils/config";
import { XBuildENV } from "../utils/env";
import { Logger } from "../utils/logger";

export async function buildCommand(options: { config?: string }) {
  const logger = new Logger("Build");
  XBuildENV.to("production");
  try {
    let config = await loadConfig(options.config);

    // 构建模式配置
    const _config = {
      ...config,
      mode: "production",
    } as XBuildContext;

    logger.info("Starting full build process...");

    // 步骤1: 类型检查
    const compiler = new TypeScriptCompiler(_config);
    const typeCheckSuccess = await compiler.checkTypes();

    if (!typeCheckSuccess) {
      logger.error("Build failed: Type checking errors found");
      process.exit(1);
    }

    // 步骤2: 生成类型声明文件
    const declarationSuccess = await compiler.emitDeclarations();

    if (!declarationSuccess) {
      logger.error("Build failed: Declaration file generation failed");
      process.exit(1);
    }

    // 步骤3: 打包构建
    const builder = new XBuilder(_config);

    const buildSuccess = await builder.runBuild();

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
  } finally {
    XBuildENV.reset();
  }
}
