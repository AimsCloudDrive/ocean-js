import { Nullable } from "../global";

export function assert(
  condition: unknown,
  message: string = ""
): asserts condition {
  if (!condition) throw Error(message);
}

export function nil<T>(data: T | Nullable | void, defaultData: T): T {
  if (data === undefined || data === null) {
    return defaultData;
  }
  return data;
}
