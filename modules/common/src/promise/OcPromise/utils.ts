import { OcPromiseLike, PromiseLike } from "./types";

export function isPromiseLike<R>(data: unknown): data is PromiseLike<R> {
  return (
    !!data &&
    (typeof data === "function" ||
      (typeof data === "object" && data !== null)) &&
    typeof data["then"] === "function"
  );
}
export function isOcPromiseLike<R>(data: unknown): data is OcPromiseLike<R> {
  return isPromiseLike<R>(data) && typeof data["cancel"] === "function";
}
