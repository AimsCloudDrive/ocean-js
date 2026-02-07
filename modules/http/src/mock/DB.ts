import {
  Collection,
  Db,
  DbOptions,
  Document,
  MongoClient,
  MongoClientOptions,
} from "mongodb";

export class DB {
  declare private db?: Db;
  get isConnected(): boolean {
    return !!this.db;
  }
  declare private client: MongoClient;
  declare private dbName: string;

  constructor(uri: string, dbName: string, option: MongoClientOptions = {}) {
    this.client = new MongoClient(uri, {
      minPoolSize: 5,
      maxPoolSize: 50,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      ...option,
    });
    this.dbName = dbName;
  }

  async connect(dbName?: string, dbOptions?: DbOptions): Promise<void> {
    dbName = dbName ?? this.dbName;
    const { client } = this;
    try {
      await client.connect();
      this.db = client.db(dbName, dbOptions);
      console.log(`✅ Connected to MongoDB database: ${dbName}`);
    } catch (error) {
      this.db = undefined;
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close(true);
      this.db = undefined;
      console.log("🔌 Disconnected from MongoDB");
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.command({ ping: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  getCollection<T extends Document>(collectionName: string): Collection<T> {
    if (!this.db) throw new Error("Database not connected");
    return this.db.collection<T>(collectionName);
  }
}
