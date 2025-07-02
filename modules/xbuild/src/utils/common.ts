import { pathToFileURL } from "url";
import path from "path";
import * as fs from "fs";
import { OcPromise, assert } from "@msom/common";

export type Only<T, U> = U extends T ? U : never;

export type StringOrRegExp = string | RegExp;

export function toFileUrl(filePath: string) {
  return pathToFileURL(path.resolve(filePath)).href;
}

export function getModuleName(path: string): string {
  return path.split("/").pop() || "";
}

export function getDemos(basePath: string): {
  [K in string]: () => OcPromise<unknown>;
} {
  const demoPath = path.resolve(basePath, "src");
  if (!fs.existsSync(demoPath)) {
    return {};
  }
  const files = fs.readdirSync(demoPath, {
    encoding: "utf-8",
    recursive: true,
  });
  const res = files
    .map((v) => v.replace("\\", "/"))
    .filter((v) => {
      return fs.statSync(path.resolve(demoPath, v)).isFile();
    })
    .reduce((res, v) => {
      const filePath = path.resolve(demoPath, v);
      if (demoFileRegExp.test(filePath)) {
        res[v] = () => {
          return OcPromise.resolve(import(toFileUrl(filePath)));
        };
      }
      return res;
    }, {});
  return res;
}

const demoFileRegExp = /\.(demo)|(dev)\.tsx$/;

export type DemosObject = {
  [K in string]: DemosObject | (() => OcPromise<unknown>);
};

export function getDemosObject(basePath: string) {
  return Object.entries(getDemos(basePath))
    .map(([key, value]) => {
      const keys = key.split("/").map((key, i, keys) => {
        if (i !== keys.length - 1) {
          return key;
        } else {
          const names = key.split(".");
          names.pop();
          return names.join(".");
        }
      });
      if (keys[0] === ".") {
        keys.shift();
      }
      return { keys, importH: value };
    })
    .reduce((result: DemosObject, { keys, importH }) => {
      let tmp: any = result;
      const name = keys.pop();
      assert(name);
      while (keys.length) {
        const key = keys.shift();
        assert(key);
        tmp[key] = tmp = tmp[key] || {};
      }
      tmp[name] = importH;
      return result;
    }, {});
}
