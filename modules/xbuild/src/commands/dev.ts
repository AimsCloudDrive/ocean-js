// src/commands/dev.ts
import { XBuilder } from "../core/builder";
import { XBuildContext } from "../core/types";
import { loadConfig } from "../utils/config";
import { XBuildENV } from "../utils/env";
import { Logger } from "../utils/logger";

export async function devCommand(options: { port?: string }) {
  const logger = new Logger("Dev");
  XBuildENV.to("development");
  try {
    let config = await loadConfig();

    // 合并开发模式特定配置
    const _config = {
      ...config,
      mode: "development",
    } as XBuildContext;

    logger.info("Starting development server...");

    const builder = new XBuilder(_config);

    const port = await builder.runDev();
    logger.success(`Development server running at http://localhost:${port}`);
  } catch (error) {
    logger.error("Error starting development server:", error);
    process.exit(1);
  } finally {
    XBuildENV.reset();
  }
}
