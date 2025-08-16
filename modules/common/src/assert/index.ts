import { Nullable } from "../global";

export function assert(
  condition: unknown,
  message: string | (() => Error) | Error = ""
): asserts condition {
  if (!condition) {
    if (typeof message === "function") {
      throw message();
    }
    throw typeof message === "string" ? Error(message) : message;
  }
}

export function nil<T>(data: T | Nullable | void, defaultData: T): T {
  if (data === undefined || data === null) {
    return defaultData;
  }
  return data;
}
