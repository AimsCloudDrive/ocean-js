import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./config/parseArgs.js";
import { connectMongo } from "./db/mongo.js";
import { startServer } from "./server.js";

// 入口脚本所在目录（开发时为 src，打包后为 dist）
const entryDir = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2), [
    // 与入口脚本同级（如 dist/.env）
    path.resolve(entryDir, ".env"),
    // 入口脚本上级目录的 public/.env（如 modules/model-designer-server/public/.env）
    path.resolve(entryDir, "../public/.env"),
    // 相对当前工作目录
    "public/.env",
  ]);
  const mongo = await connectMongo(config);
  startServer(config.port, mongo);

  const shutdown = () => void mongo.client.close().finally(() => process.exit(0));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "服务启动失败");
  process.exitCode = 1;
});
