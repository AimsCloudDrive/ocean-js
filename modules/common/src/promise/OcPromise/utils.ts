import { thenable } from "./types";

export function isPromiseLike<R, E extends Error | unknown = Error>(
  data: unknown
): data is thenable<R, E> {
  return (
    !!data &&
    (typeof data === "function" || typeof data === "object") &&
    typeof data["then"] === "function" &&
    data["then"].length === 2
  );
}
