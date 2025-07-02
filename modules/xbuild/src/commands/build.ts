// src/commands/build.ts
import { XBuilder } from "../core/builder";
import { XBuildContext } from "../core/types";
import { loadConfig } from "../utils/config";
import { XBuildENV } from "../utils/env";
import { Logger } from "../utils/logger";

export async function buildCommand(options: {
  config?: string;
  compile?: true;
}) {
  const logger = new Logger("Build");
  XBuildENV.to("production");
  try {
    let config = await loadConfig(options.config, {
      compile: options.compile === true,
    });

    // 构建模式配置
    const _config = {
      ...config,
      mode: "production",
    } as XBuildContext;

    logger.info("Starting full build process...");

    // 步骤3: 打包构建
    const builder = new XBuilder(_config);

    console.time("time of build");
    const buildSuccess = await builder.runBuild();
    console.timeEnd("time of build");

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
