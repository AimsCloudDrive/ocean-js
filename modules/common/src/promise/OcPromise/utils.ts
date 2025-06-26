import { OcPromiseLike, PromiseLike } from "./types";

export function isPromiseLike<R, E extends Error | unknown = Error>(
  data: unknown
): data is PromiseLike<R, E> {
  return (
    !!data &&
    (typeof data === "function" ||
      (typeof data === "object" && data !== null)) &&
    typeof data["then"] === "function"
  );
}
export function isOcPromiseLike<
  R,
  E extends Error | unknown = Error,
  C extends unknown = unknown
>(data: unknown): data is OcPromiseLike<R, E, C> {
  return isPromiseLike<R, E>(data) && typeof data["cancel"] === "function";
}
