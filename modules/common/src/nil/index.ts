import { Nullable } from "../global";

export function nil<T>(data: T | Nullable | void, defaultData: T): T {
  if (data === undefined || data === null) {
    return defaultData;
  }
  return data;
}
