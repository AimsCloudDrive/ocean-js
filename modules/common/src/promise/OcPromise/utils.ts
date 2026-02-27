import { OcPromiseLike, PromiseLike } from "./types";

export function isPromiseLike<R = never, E = never>(
  data: unknown,
): data is PromiseLike<R, E> {
  return (
    !!data &&
    (typeof data === "function" ||
      (typeof data === "object" && data !== null)) &&
    typeof data["then"] === "function"
  );
}
export function isOcPromiseLike<R = never, E = never, C = never>(
  data: unknown,
): data is OcPromiseLike<R, E, C> {
  return isPromiseLike<R, E>(data) && typeof data["cancel"] === "function";
}
