import { createServer, createProxyMiddleware } from "@msom/http";

const server = createServer(9999, {
  createHandle: () => {
    console.log("服务器已启动9999");
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
