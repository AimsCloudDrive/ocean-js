import { createServer } from "@msom/http";
import { proxyConfig as defaultProxyConfig } from "./proxy_config";

const PORT = 9095;

// 配置代理
const proxyConfig = {
  // 其他代理配置
  ...defaultProxyConfig,
  // 默认转发到 mock-server
  "/mock-server/": {
    target: "http://localhost:65500",
    changeOrigin: true,
    pathRewrite: {
      "^/mock-server/": "/",
    },
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      console.log(
        `[DEFAULT MOCK PROXY] ${req.method} ${req.originalUrl} -> ${proxyReq.url}`,
      );
    },
  },
};

// 创建服务器
createServer(PORT, {
  middles: { define: (defaults) => defaults.slice(0, 1) },
  printProxy: true,
  proxy: proxyConfig,
  createHandle: ({ port }) => {
    console.log(`\n🚀 Proxy server running on port ${port}`);
  },
});
