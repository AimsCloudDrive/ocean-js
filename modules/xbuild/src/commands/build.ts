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
    const isCompile = options.compile === true;
    let config = await loadConfig(options.config, {
      compile: isCompile,
    });

    // 构建模式配置
    const _config = {
      ...config,
      mode: "production",
    } as XBuildContext;

    logger.info(
      `Starting ${isCompile ? "compile" : "build"} of full build process...`
    );

    // 步骤3: 打包构建
    const builder = new XBuilder(_config);
    const timeFlag = `time of ${isCompile ? "compile" : "build"}`;
    console.time(timeFlag);
    const buildSuccess = await builder.runBuild();
    console.timeEnd(timeFlag);

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
