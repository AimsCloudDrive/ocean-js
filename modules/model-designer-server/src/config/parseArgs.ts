import fs from "node:fs";

export interface ServerConfig {
  db: string;
  mongo: string;
  user: string;
  password: string;
  port: number;
}

const REQUIRED = ["db", "mongo", "user", "password"] as const;

/** 解析 --key value 形式的命令行参数 */
function parseArgv(args: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`启动参数格式错误：${flag ?? "缺少参数"}`);
    }
    values[flag.slice(2)] = value;
  }
  return values;
}

/** 解析 KEY=VALUE 形式的 .env 文件，忽略空行与 # 注释 */
function parseEnvFile(filePath: string): Record<string, string> {
  const values: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    values[key] = value;
  }
  return values;
}

/** 按顺序查找第一个存在的 .env 文件并解析（空文件则继续查找下一个） */
function loadEnvValues(envFilePath: string | string[]): Record<string, string> {
  for (const filePath of [envFilePath].flat()) {
    if (!fs.existsSync(filePath)) continue;
    const values = parseEnvFile(filePath);
    if (Object.keys(values).length > 0) return values;
  }
  return {};
}

/**
 * 解析服务配置，优先级：命令行参数 > .env 文件 > 报错
 * @param args 命令行参数
 * @param envFilePath .env 文件路径（相对当前工作目录或绝对路径，支持多个候选按顺序查找）
 */
export function parseArgs(args: string[], envFilePath: string | string[] = "public/.env"): ServerConfig {
  const values: Record<string, string> = {
    ...loadEnvValues(envFilePath),
    ...parseArgv(args),
  };

  for (const key of REQUIRED) {
    if (!values[key]?.trim()) {
      throw new Error(`启动参数 --${key} 必填（命令行与 ${envFilePath} 均未提供）`);
    }
  }

  const port = Number(values["port"] ?? "9090");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("启动参数 --port 必须是 1 到 65535 的整数");
  }

  return {
    db: values["db"],
    mongo: values["mongo"],
    user: values["user"],
    password: values["password"],
    port,
  };
}
