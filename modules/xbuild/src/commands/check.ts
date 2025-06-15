// src/commands/check.ts
import { XBuildConfig } from "../core/types";
import { TypeScriptCompiler } from "../core/compiler";
import { loadConfig } from "../utils/config";
import { Logger } from "../utils/logger";

export async function checkCommand(options: { config?: string }) {
  const logger = new Logger("Check");
  try {
    const config = await loadConfig(options.config);
    logger.info("Starting type checking...");

    await config.plugins.applyHook("beforeCheck");

    const compiler = new TypeScriptCompiler(config);
    const success = await compiler.checkTypes();

    await config.plugins.applyHook("afterCheck", success);

    if (!success) {
      logger.error("Type checking failed");
      process.exit(1);
    }

    logger.success("Type checking completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during type checking:", error);
    process.exit(1);
  }
}
