import { XBuilder } from "../core/builder";
import { XBuildContext, XbuildDevOptions } from "../core/types";
import { loadConfig } from "../utils/config";
import { XBuildENV } from "../utils/env";
import { Logger } from "../utils/logger";

interface DevCommandOption extends XbuildDevOptions {
  config?: string;
}

export async function devCommand(options: DevCommandOption) {
  const logger = new Logger("Dev");
  XBuildENV.to("development");
  try {
    let config = await loadConfig(options.config, { compile: true });

    // 合并开发模式特定配置
    const _config = {
      ...config,
      mode: "development",
    } as XBuildContext;

    logger.info("Starting development server...");

    const builder = new XBuilder(_config);

    const port = await builder.runDev(options);
    logger.success(`Development server running at http://localhost:${port}`);
  } catch (error) {
    logger.error("Error starting development server:", error);
    process.exit(1);
  } finally {
    XBuildENV.reset();
  }
}
