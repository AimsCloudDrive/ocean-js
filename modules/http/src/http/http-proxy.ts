import express, { Request, Response, NextFunction } from "express";
import http, { IncomingMessage, ServerResponse } from "http";
import https from "https";
import { parse } from "url";
import net, { Socket } from "net";
import fs from "fs";

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
  onProxyReq?: (
    proxy: ProxyOptions & { path: string },
    req: Request,
    res: Response
  ) => void;
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
export function createProxyMiddleware(
  options: ProxyOptions
): express.RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // 执行 bypass 函数检查
    if (options.bypass) {
      const bypassResult = options.bypass(req);
      if (bypassResult === false) {
        return next();
      }
    }

    // 解析目标 URL
    const targetUrl = new URL(options.target);

    // 应用路径重写
    let rewrittenPath = req.path;
    if (options.pathRewrite) {
      if (typeof options.pathRewrite === "function") {
        rewrittenPath = options.pathRewrite(req.path);
      } else {
        for (const [pattern, replacement] of Object.entries(
          options.pathRewrite
        )) {
          const regex = new RegExp(pattern);
          rewrittenPath = rewrittenPath.replace(regex, replacement);
        }
      }
    }

    // 准备请求选项
    const requestOptions: http.RequestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
      path:
        rewrittenPath +
        (req.url.includes("?") ? `?${req.url.split("?")[1]}` : ""),
      method: req.method,
      headers: { ...req.headers },
    };

    // 修改 Origin 头
    if (options.changeOrigin !== false) {
      requestOptions.headers!["host"] = targetUrl.host;
    }

    // 选择 HTTP 或 HTTPS 模块
    const requestModule = targetUrl.protocol === "https:" ? https : http;

    // 创建代理请求
    const proxyReq = requestModule.request(
      requestOptions,
      (proxyRes: IncomingMessage) => {
        options.onProxyReq?.(
          Object.assign({}, options, { path: requestOptions.path ?? "" }),
          req,
          res
        );
        // 设置响应头
        res.status(proxyRes.statusCode || 500);
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (value) {
            res.setHeader(key, value);
          }
        });

        // 转发响应体
        proxyRes.pipe(res);
      }
    );

    // 处理错误
    proxyReq.on("error", (err: Error) => {
      if (options.onError) {
        options.onError(err, req, res);
      } else {
        console.error(`Proxy error: ${err.message}`);
        res.status(500).send("Proxy error");
      }
    });

    // 转发请求体
    if (req.body && Object.keys(req.body).length > 0) {
      proxyReq.write(JSON.stringify(req.body));
    }
    req.pipe(proxyReq);
  };
}

/**
 * 创建 WebSocket 代理中间件
 *
 * @param options - 代理配置选项
 * @returns Express 中间件函数
 */
export function createWebSocketProxy(
  options: ProxyOptions
): express.RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // 只处理 WebSocket 升级请求
    if (req.headers.upgrade !== "websocket") {
      return next();
    }

    // 解析目标 URL
    const targetUrl = new URL(options.target);

    // 创建到目标服务器的连接
    const proxySocket = net.connect(
      +targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
      targetUrl.hostname,
      () => {
        // 创建请求头
        const headers = [
          `GET ${req.url} HTTP/1.1`,
          `Host: ${
            options.changeOrigin !== false ? targetUrl.host : req.headers.host
          }`,
          `Connection: Upgrade`,
          `Upgrade: websocket`,
          `Sec-WebSocket-Version: ${req.headers["sec-websocket-version"]}`,
          `Sec-WebSocket-Key: ${req.headers["sec-websocket-key"]}`,
        ];

        // 发送升级请求
        proxySocket.write(headers.join("\r\n") + "\r\n\r\n");
      }
    );

    // 客户端 socket
    const clientSocket = req.socket as any as Socket;

    // 建立双向管道
    clientSocket.pipe(proxySocket);
    proxySocket.pipe(clientSocket);

    // 处理错误
    clientSocket.on("error", () => proxySocket.destroy());
    proxySocket.on("error", () => clientSocket.destroy());
  };
}

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
export function setupProxy(
  app: express.Application,
  proxyRules: ProxyRules
): void {
  Object.entries(proxyRules).forEach(([path, rule]) => {
    // 规范化配置
    const options: ProxyOptions =
      typeof rule === "string" ? { target: rule } : rule;

    // 创建代理中间件
    const proxyMiddleware = createProxyMiddleware({
      ...options,
      target: options.target,
    });

    // 注册中间件
    app.use(path, proxyMiddleware);

    // 如果需要代理 WebSocket
    if (options.ws) {
      const wsProxy = createWebSocketProxy(options);
      app.use(path, wsProxy);
    }
  });
}
