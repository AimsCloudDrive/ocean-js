import { RequestHandler } from "express";

const express: typeof import("express") = require("express");
const cors: typeof import("cors") = require("cors");

type RequestMethod =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "copy"
  | "head"
  | "options"
  | "link"
  | "unlink"
  | "purge"
  | "lock"
  | "unlock"
  | "propfind";

export type ServerRoute<T extends string | RegExp = any> = {
  path: T;
  method?: RequestMethod;
  children?: ServerRoute[];
  handlers?: RequestHandler[];
};

/**
 *
 * @param port
 * @param option
 * @returns
 * @example
 createServer(8088, {
  routes: [
    {
      path: "/api",
      children: [
        {
          path: "/userCreate",
          method: "post",
          handlers: [
            express.json(),
            (request, response) => {
              console.log("aaa");
              response.send({ aaa: 1 });
            },
          ],
        },
      ],
    },
  ],
  createHandle: () => {
    console.log("userServer ready");
  },
});
 */
export function createServer(
  port: number,
  option: {
    routes?: ServerRoute[];
    createHandle?: () => void;
    middles?: RequestHandler[] | RequestHandler;
  } = {}
): Express.Application {
  const server = express();
  let { createHandle, routes, middles } = option;
  [
    cors({
      origin: "*",
    }),
    express.json(),
    middles || [],
  ]
    .flat()
    .reduce<typeof server>((a, b) => a.use(b), server);
  if (routes) {
    const parseRoute = (routes: ServerRoute[], parentPath: string) => {
      for (const route of routes) {
        let { path, children, method, handlers = [] } = route;
        path = parentPath + path;
        if (method) {
          const requestF = server[method].bind(server);
          requestF(path, ...handlers);
        }
        if (children) {
          parseRoute(children, path);
        }
      }
    };
    parseRoute(routes, "");
  }
  server.listen(port, () => {
    typeof createHandle === "function" && createHandle();
  });
  return server;
}
