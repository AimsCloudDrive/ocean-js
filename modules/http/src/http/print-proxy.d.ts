import { ProxyRules } from "./http-proxy";
/**
 * 生成详细代理规则报告（对齐格式）
 * @param proxyRules 代理规则配置
 * @returns 格式化的代理规则描述数组
 */
export declare function generateAlignedProxyReport(proxyRules: ProxyRules, detail?: boolean): string[];
/**
 * 打印对齐的代理服务器信息
 * @param port 服务器端口
 * @param proxyRules 代理规则配置
 */
export declare function printAlignedProxyServerInfo(port: number, proxyRules?: ProxyRules | null, printer?: (message: string) => void, detail?: boolean): void;
