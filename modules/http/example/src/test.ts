import { createServer, createProxyMiddleware } from "@msom/http";

const server = createServer(9208, {
  createHandle: () => {
    console.log("代理服务器已启动");
    console.log("本地地址: http://localhost:9208");
    console.log("目标地址: https://ybzg.cqxdsk.com:18002/prod-api");
  },
  printProxy: true,
  proxy: {
    "/": {
      target: "https://ybzg.cqxdsk.com:18002",
      changeOrigin: true,
      pathRewrite: {
        "^/": "/prod-api/", // 重写路径，将所有请求转发到 /prod-api
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error("[PROXY ERROR]", err);
        res.status(500).send("Proxy Error");
      },
    },
  },
});
