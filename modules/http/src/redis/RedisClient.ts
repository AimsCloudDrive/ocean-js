import { createClient, RedisClientType } from "redis";

const DEFAULT_CACHE_TTL = 60; // 默认缓存时间1分钟

export class RedisClient {
  private client: RedisClientType;
  private defaultTTL: number;

  declare connecting: Promise<void>;

  constructor(options?: { url?: string; defaultTTL?: number }) {
    this.client = createClient({
      url: options?.url || "redis://localhost:6379",
    });
    this.defaultTTL = options?.defaultTTL || DEFAULT_CACHE_TTL;
    this.connecting = this.connect();
  }

  private async connect() {
    try {
      await this.client.connect();
      console.log("Redis client connected successfully");
    } catch (error) {
      console.error("Redis connection error:", error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Redis get error:", error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const expireTime = ttl || this.defaultTTL;
      await this.client.set(key, JSON.stringify(value), {
        EX: expireTime,
      });
    } catch (error) {
      console.error("Redis set error:", error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error("Redis del error:", error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushAll();
    } catch (error) {
      console.error("Redis clear error:", error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.connecting = Promise.reject();
      console.log("Redis client disconnected successfully");
    } catch (error) {
      console.error("Redis disconnect error:", error);
    }
  }
}
