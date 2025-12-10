import { createServer, createProxyMiddleware } from "@msom/http";

const server = createServer(9208, {
  createHandle: () => {
    console.log("代理服务器已启动");
    console.log("本地地址: http://localhost:9208");
    console.log("目标地址: https://ybzg.cqxdsk.com:18002/prod-api");
  },
  printProxy: true,
  proxy: {},
});
