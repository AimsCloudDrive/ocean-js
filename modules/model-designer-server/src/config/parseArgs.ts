function parseArgv(args: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (!flag?.startsWith("--")) {
      throw new Error(`启动参数格式错误：${flag ?? "缺少参数"}`);
    }
    const value = args[++index];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`启动参数格式错误：${flag}`);
    }
    values[flag.slice(2)] = value;
  }
  return values;
}

function parsePort(value: string | undefined, defaultValue: number, label: string): number {
  const port = Number(value ?? String(defaultValue));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`启动参数 --${label} 必须是 1 到 65535 的整数`);
  }
  return port;
}

export interface ServerConfig {
  port: number;
}

export function parseArgs(args: string[]): ServerConfig {
  const values = parseArgv(args);
  return {
    port: parsePort(values["port"], 9091, "port"),
  };
}
