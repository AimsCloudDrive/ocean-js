import { MongoClient } from "mongodb";

export interface MongoConnectionInfo {
  dbHost: string;
  dbPort: number;
  db?: string;
  user: string;
  password: string;
}

function buildUri(info: Pick<MongoConnectionInfo, "dbHost" | "dbPort">): string {
  return `mongodb://${info.dbHost}:${info.dbPort}`;
}

export async function connectMongoClient(info: MongoConnectionInfo): Promise<MongoClient> {
  const client = new MongoClient(buildUri(info), {
    auth: { username: info.user, password: info.password },
  });
  await client.connect();
  return client;
}
