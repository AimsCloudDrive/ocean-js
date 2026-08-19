import { parseArgs } from "./config/parseArgs.js";
import { ConnectionManager, startServer } from "./server.js";

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));
  const manager = new ConnectionManager();

  startServer(config.port, manager);

  const shutdown = () => {
    void manager.disconnect().finally(() => process.exit(0));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "服务启动失败");
  process.exitCode = 1;
});
