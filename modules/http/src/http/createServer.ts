import cors from "cors";
import express from "express";
import { ProxyRules, setupProxy } from "./http-proxy";
import { printAlignedProxyServerInfo } from "./print-proxy";
import { isArray, isObject } from "@msom/common";

type RequestMethod =
  | "all"
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
  handlers?: express.RequestHandler[];
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
    createHandle?: (option: { port: number }) => void;
    middles?:
      | express.RequestHandler[]
      | express.RequestHandler
      | {
          define: (
            defaults: express.RequestHandler[]
          ) => express.RequestHandler[] | express.RequestHandler;
        };
    proxy?: ProxyRules;
    printProxy?: boolean | { print?: boolean; detail?: boolean };
  } = {}
): express.Application {
  const server = express();
  const { createHandle, routes, middles, proxy } = option;
  const defaultMiddles = [
    cors({
      origin: "*",
    }),
    express.json(),
  ];
  if (middles && !isArray(middles) && typeof middles !== "function") {
    const m = middles.define;
    [m(defaultMiddles)]
      .flat()
      .reduce<typeof server>((a, b) => a.use(b), server);
  } else {
    [...defaultMiddles, middles || []]
      .flat()
      .reduce<typeof server>((a, b) => a.use(b), server);
  }
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
  if (proxy) {
    setupProxy(server, proxy);
  }
  server.listen(port, () => {
    typeof createHandle === "function" && createHandle({ port });
    const printProxy = isObject(option.printProxy)
      ? option.printProxy
      : { print: option.printProxy, detail: false };
    printProxy.print !== false &&
      printAlignedProxyServerInfo(port, proxy, undefined, printProxy.detail);
  });
  return server;
}

export function staticMiddle(path: string): ReturnType<typeof express.static> {
  return express.static(path);
}
