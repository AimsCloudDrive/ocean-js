import express, { Request, Response } from "express";
/**
 * 代理配置选项接口
 *
 * @property target - 目标服务器地址（必需）
 * @property changeOrigin - 是否修改请求头中的 Host 为目标地址（默认为 true）
 * @property secure - 是否验证 SSL 证书（默认为 true）
 * @property pathRewrite - 路径重写规则（对象或函数）
 * @property ws - 是否代理 WebSocket 连接（默认为 false）
 * @property bypass - 自定义绕过函数，返回 false 时不代理
 * @property onError - 代理错误处理函数
 */
export interface ProxyOptions {
    target: string;
    changeOrigin?: boolean;
    secure?: boolean;
    pathRewrite?: Record<string, string> | ((path: string) => string);
    ws?: boolean;
    bypass?: (req: Request) => boolean | string | void;
    onError?: (err: Error, req: Request, res: Response) => void;
    onProxyReq?: (proxy: ProxyOptions & {
        path: string;
        url: string;
    }, req: Request, res: Response) => void;
}
/**
 * 代理规则类型
 */
export type ProxyRules = Record<string, ProxyOptions | string>;
/**
 * 创建代理中间件
 *
 * @param {ProxyOptions} options - 代理配置选项
 * @returns Express 中间件函数
 */
export declare function createProxyMiddleware(options: ProxyOptions): express.RequestHandler;
/**
 * 创建 WebSocket 代理中间件
 *
 * @param options - 代理配置选项
 * @returns Express 中间件函数
 */
export declare function createWebSocketProxy(options: ProxyOptions): express.RequestHandler;
/**
 * 创建代理服务器
 *
 * @param app - Express 应用实例
 * @param proxyRules - 代理规则配置
 * @example
// 示例使用
const app = express();
app.use(express.json());

// 配置代理规则
const proxyConfig: ProxyRules = {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
    ws: true,
    bypass: (req) => {
      // 绕过 POST 请求
      return req.method === "POST" ? false : undefined;
    },
    onError: (err, req, res) => {
      console.error(`API Proxy Error: ${err.message}`);
      res.status(502).json({ error: "Bad Gateway" });
    },
  },
  "/external": {
    target: "https://jsonplaceholder.typicode.com",
    changeOrigin: true,
    pathRewrite: (path) => path.replace(/^\/external/, ""),
    secure: false, // 开发环境忽略 SSL 错误
  },
  "/images": "http://localhost:3002", // 简写形式
};

// 设置代理
setupProxy(app, proxyConfig);

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
  console.log("Available proxies:");
  console.log("  /api -> http://localhost:3001");
  console.log("  /external -> https://jsonplaceholder.typicode.com");
  console.log("  /images -> http://localhost:3002");
});

 * }
 */
export declare function setupProxy(app: express.Application, proxyRules: ProxyRules): void;
