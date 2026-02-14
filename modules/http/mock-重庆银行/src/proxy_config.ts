// const target = "http://demo.dx.it-fly.cn:9095";
const target = "http://116.63.132.84:9095";
export const proxyConfig = {
  "/upms/": {
    target,
    changeOrigin: true,
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      console.log(
        `[PROXY:/upms/] ${req.method} ${req.protocol}://${req.host}${req.originalUrl} -> ${proxyReq.url}`,
      );
    },
  },
  "/fds/": {
    target,
    changeOrigin: true,
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      console.log(
        `[PROXY:/fds/] ${req.method} ${req.protocol}://${req.host}${req.originalUrl} -> ${proxyReq.url}`,
      );
    },
  },
  "/app/": {
    target,
    changeOrigin: true,
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      console.log(
        `[PROXY:/app/] ${req.method} ${req.protocol}://${req.host}${req.originalUrl} -> ${proxyReq.url}`,
      );
    },
  },
};
