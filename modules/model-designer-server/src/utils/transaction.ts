import type { ClientSession, MongoClient } from "mongodb";

/**
 * 匹配 MongoDB 单机实例（standalone）不支持多文档事务时的错误消息。
 * 涵盖各版本驱动常见文案：
 * - "Transaction numbers are only allowed on a replica set member or mongos"
 * - "Transactions are not supported by this deployment"
 * - "This MongoDB deployment does not support transactions ... Standalone"
 */
const TRANSACTION_NOT_SUPPORTED_PATTERN = /Transaction numbers|Transactions are not supported|Standalone/i;

export function isTransactionNotSupportedError(error: unknown): boolean {
  return error instanceof Error && TRANSACTION_NOT_SUPPORTED_PATTERN.test(error.message);
}

/**
 * 优先使用多文档事务执行 operation；
 * 若当前部署（如 MongoDB 单机实例）不支持事务，则降级执行 fallback 补偿流程。
 * 其余错误照常抛出，不做任何包装。
 */
export async function runWithTransaction<T>(
  client: MongoClient,
  operation: (session: ClientSession) => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  const session = client.startSession();
  try {
    try {
      return await session.withTransaction(operation);
    } catch (error) {
      if (!isTransactionNotSupportedError(error)) throw error;
    }
  } finally {
    await session.endSession();
  }
  return fallback();
}
