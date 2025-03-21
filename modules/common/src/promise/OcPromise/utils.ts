import { thenable } from "./types";

export function isPromiseLike<R, E extends Error | unknown = Error>(
  data: unknown
): data is Omit<thenable<R, E>, "cancel"> {
  return (
    !!data &&
    (typeof data === "function" ||
      (typeof data === "object" && data !== null)) &&
    typeof data["then"] === "function" &&
    data["then"].length === 2
  );
}
