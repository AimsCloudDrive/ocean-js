import { createServer } from "@msom/http";

createServer(9999, {
  createHandle: ({ port }) => {
    console.log("服务器已启动", port);
  },
  printProxy: true,
  routes: [
    {
      path: "/ttt",
      children: [
        {
          path: "/aaa",
          method: "post",
          children: [
            {
              path: "/:qqq",
              method: "post",
              handlers: [
                (req, res) => {
                  console.log("post qqq ......");
                  const { params, query, body } = req;
                  try {
                    res.status(200).send({
                      aaa: 1,
                      type: "post",
                      params,
                      query,
                      body,
                      url: req.url,
                    });
                  } catch (e) {
                    res.status(200).send({
                      aaa: 1,
                      type: "post",
                      params,
                      query,
                      body: e,
                      error: true,
                      url: req.url,
                    });
                  }
                },
              ],
            },
          ],
          handlers: [
            (req, res) => {
              console.log("post aaa ......");
              const { params, query, body } = req;
              res.status(200).send({
                aaa: 1,
                type: "post",
                params,
                query,
                body,
                url: req.url,
              });
            },
          ],
        },
      ],
    },
  ],
});
// createServer(9208, {
//   middles: {
//     define: (ds) => {
//       return ds[0];
//     },
//   },
//   createHandle: ({ port }) => {
//     console.log("服务器已启动", port);
//   },
//   printProxy: true,
//   proxy: {
//     "/ttt": {
//       target: "http://localhost:9999",
//       changeOrigin: true,
//       onProxyReq: (proxyReq, req, res) => {
//         console.log(
//           `[PROXY:9208] ${req.method} ${req.protocol}://${req.host}${req.originalUrl} -> ${proxyReq.url}`
//         );
//       },
//       onError: (err, req, res) => {
//         console.error("[PROXY ERROR]", err);
//         res.status(500).send("Proxy Error");
//       },
//     },
//   },
// });
// createServer(9201, {
//   middles: {
//     define: (ds) => {
//       return ds[0];
//     },
//   },
//   createHandle: ({ port }) => {
//     console.log("服务器已启动", port);
//   },
//   printProxy: true,
//   proxy: {
//     "/": {
//       target: "https://ybzg.cqxdsk.com:18002",
//       changeOrigin: true,
//       pathRewrite: {
//         "^/": "/prod-api/", // 重写路径，将所有请求转发到 /prod-api
//       },
//       onProxyReq: (proxyReq, req, res) => {
//         console.log(
//           `[PROXY:9201] ${req.method} ${req.protocol}://${req.host}${req.url} -> ${proxyReq.target}${proxyReq.path}`
//         );
//       },
//       onError: (err, req, res) => {
//         console.error("[PROXY ERROR]", err);
//         res.status(500).send("Proxy Error");
//       },
//     },
//   },
// });
