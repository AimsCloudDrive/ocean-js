import { MongoClient } from "mongodb";
import type { ServerConfig } from "../config/parseArgs.js";

export async function connectMongo(config: ServerConfig) {
  const client = new MongoClient(config.mongo, {
    auth: { username: config.user, password: config.password },
  });
  await client.connect();
  return { client, db: client.db(config.db) };
}
