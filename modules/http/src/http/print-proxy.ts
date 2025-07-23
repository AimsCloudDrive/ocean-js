import { ProxyRules } from "./http-proxy";

const NO_PROXY = "No proxy rules configured";
const Available_Proxies = "Available Proxies:";

/**
 * 生成详细代理规则报告（对齐格式）
 * @param proxyRules 代理规则配置
 * @returns 格式化的代理规则描述数组
 */
export function generateAlignedProxyReport(proxyRules: ProxyRules): string[] {
  if (!proxyRules || Object.keys(proxyRules).length === 0) {
    return [NO_PROXY];
  }

  // 计算最大路径长度用于对齐
  const maxPathLength = Math.max(
    ...Object.keys(proxyRules).map((path) => {
      const formattedPath = path.endsWith("/") ? path : `${path}/`;
      return formattedPath.length;
    })
  );

  return Object.entries(proxyRules).map(([path, rule]) => {
    // 格式化路径
    const formattedPath = path.endsWith("/") ? path : `${path}/`;

    // 获取目标地址
    const target = typeof rule === "string" ? rule : rule.target;

    // 创建基础行（对齐路径和箭头）
    const baseLine = `  ${formattedPath.padEnd(maxPathLength)} -> ${target}`;

    // 添加选项信息（如果有）
    if (typeof rule !== "string") {
      const options: string[] = [];
      if (rule.changeOrigin !== undefined)
        options.push(`changeOrigin: ${rule.changeOrigin}`);
      if (rule.secure !== undefined) options.push(`secure: ${rule.secure}`);
      if (rule.ws) options.push(`ws: true`);
      if (rule.pathRewrite)
        options.push(`pathRewrite: ${typeof rule.pathRewrite}`);
      if (rule.bypass) options.push(`bypass: function`);

      if (options.length > 0) {
        // 计算选项缩进（路径对齐位置 + 箭头长度 + 空格）
        const optionIndent = " ".repeat(maxPathLength + 6);
        const optionLines = options.map((opt, i) =>
          i === 0 ? `[${opt}` : `${optionIndent} ${opt}`
        );

        // 添加结束括号
        optionLines[optionLines.length - 1] += "]";

        return `${baseLine} ${optionLines.join("\n" + optionIndent)}`;
      }
    }

    return baseLine;
  });
}

/**
 * 打印对齐的代理服务器信息
 * @param port 服务器端口
 * @param proxyRules 代理规则配置
 */
export function printAlignedProxyServerInfo(
  port: number,
  proxyRules?: ProxyRules | null,
  printer: (message: string) => void = console.log.bind(console)
): void {
  if (proxyRules == undefined) {
    return;
  }
  printer(`Proxy server running at http://localhost:${port}`);
  const rules = generateAlignedProxyReport(proxyRules);
  if (rules[0] !== NO_PROXY) {
    printer(Available_Proxies);
  }
  rules.forEach((rule) => printer(rule));
}
