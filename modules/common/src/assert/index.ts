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
