import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";

export default defineConfig({
  build: {
    external: [
      "mongodb",
      "cors",
      "express",
      "chalk",
      "tslib",
      "body-parser",
      /^@babel\//,
      /^@rollup\//,
      /^@msom\//,
    ],
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
        paths: {},
        noCheck: true,
        sourceMap: true,
      }),
    ],
    input: "./src/index.ts",
    output: [
      {
        sourcemap: true,
        dir: "./dist",
        format: "esm",
      },
    ],
  },
  dev: {
    port: 9208,
    proxy: {
      "/ttt": {
        target: "http://localhost:9999/aaac?a=1",
        pathRewrite: (p) => {
          return p;
        },
        changeOrigin: true,
        onProxyReq: (proxyReq, req, res) => {
          console.log(
            `[PROXY] ${req.method} ${req.protocol}://${req.host}${req.originalUrl} -> ${proxyReq.url}`
          );
        },
        onError: (err, req, res) => {
          console.error("[PROXY ERROR]", err);
          res.status(500).send("Proxy Error");
        },
      },
      "/": {
        target: "https://ybzg.cqxdsk.com:18002",
        changeOrigin: true,
        pathRewrite: {
          "^/": "/prod-api/", // 重写路径，将所有请求转发到 /prod-api
        },
        onProxyReq: (proxyReq, req, res) => {
          console.log(
            `[PROXY] ${req.method} ${req.protocol}://${req.host}${req.url} -> ${proxyReq.target}${proxyReq.path}`
          );
        },
        onError: (err, req, res) => {
          console.error("[PROXY ERROR]", err);
          res.status(500).send("Proxy Error");
        },
      },
    },
  },
});
