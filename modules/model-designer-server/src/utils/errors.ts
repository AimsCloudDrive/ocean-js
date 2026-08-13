export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function assertPayload(condition: unknown, message: string): asserts condition {
  if (!condition) throw new AppError(400, "INVALID_PAYLOAD", message);
}
