export interface ServerConfig {
  db: string;
  mongo: string;
  user: string;
  password: string;
  port: number;
}

const REQUIRED = ["db", "mongo", "user", "password"] as const;

export function parseArgs(args: string[]): ServerConfig {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`启动参数格式错误：${flag ?? "缺少参数"}`);
    }
    values.set(flag.slice(2), value);
  }

  for (const key of REQUIRED) {
    if (!values.get(key)?.trim()) throw new Error(`启动参数 --${key} 必填`);
  }

  const port = Number(values.get("port") ?? "9090");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("启动参数 --port 必须是 1 到 65535 的整数");
  }

  return {
    db: values.get("db")!,
    mongo: values.get("mongo")!,
    user: values.get("user")!,
    password: values.get("password")!,
    port,
  };
}
