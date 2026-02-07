import { createServer } from "@msom/http";

createServer(9201, {
  middles: {
    define: (ds) => {
      return ds[0];
    },
  },
  createHandle: ({ port }) => {
    console.log("服务器已启动", port);
  },
  printProxy: true,
  proxy: {
    "/": {
      target: "https://ybzg.cqxdsk.com:18002/prod-api/",
      changeOrigin: true,
      onProxyReq: (proxyReq, req, res) => {
        console.log(
          `[PROXY:9201 ${req.method}] ${req.originalUrl} -> ${proxyReq.path}`
        );
      },
      onError: (err, req, res) => {
        console.error("[PROXY ERROR]", err);
        res.status(500).send("Proxy Error");
      },
    },
  },
});
