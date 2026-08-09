import express from "express";
import { ProxyRules } from "./http-proxy";
type RequestMethod = "all" | "get" | "post" | "put" | "patch" | "delete" | "copy" | "head" | "options" | "link" | "unlink" | "purge" | "lock" | "unlock" | "propfind";
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
export declare function createServer(port: number, option?: {
    routes?: ServerRoute[];
    createHandle?: (option: {
        port: number;
    }) => void;
    middles?: express.RequestHandler[] | express.RequestHandler | {
        define: (defaults: express.RequestHandler[]) => express.RequestHandler[] | express.RequestHandler;
    };
    proxy?: ProxyRules;
    printProxy?: boolean | {
        print?: boolean;
        detail?: boolean;
    };
}): express.Application;
export declare function staticMiddle(path: string): ReturnType<typeof express.static>;
export {};
