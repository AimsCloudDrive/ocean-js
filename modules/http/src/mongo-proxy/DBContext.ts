import { BSON, Collection, Db, MongoClient, MongoClientOptions } from "mongodb";
import { ModelMeta } from "./interfaces";

const MODEL_METADATA_COLLECTION = "__model_metas__";

interface DBContextOption extends MongoClientOptions {}

export class DBContext {
  private declare db: Db;
  private declare modelMetas: Map<string, ModelMeta>;
  private declare isConnected: boolean;
  private declare client: MongoClient;

  constructor(uri: string, option: DBContextOption = {}) {
    this.client = new MongoClient(uri, {
      minPoolSize: 5,
      maxPoolSize: 50,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      ...option,
    });
    this.modelMetas = new Map<string, ModelMeta>();
    this.isConnected = false;
  }
  async connect(dbName: string): Promise<void> {
    const { client } = this;
    try {
      await client.connect();
      this.db = client.db(dbName);
      await this.loadModelMetas();
      this.isConnected = true;
      console.log(`✅ Connected to MongoDB database: ${dbName}`);
    } catch (error) {
      this.isConnected = false;
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close(true);
      this.isConnected = false;
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

  private async loadModelMetas(): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const collection = this.db.collection<ModelMeta>(
        MODEL_METADATA_COLLECTION
      );
      const metas = await collection.find().toArray();

      this.modelMetas.clear();
      for (const meta of metas) {
        this.modelMetas.set(meta.modelName, meta);
      }
      console.log(`📚 Loaded ${metas.length} model metadata definitions`);
    } catch (error) {
      console.error("Failed to load model metadata:", error);
    }
  }

  async saveModelMeta(meta: ModelMeta): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const collection = this.db.collection<ModelMeta>(
        MODEL_METADATA_COLLECTION
      );
      await collection.updateOne(
        { modelName: meta.modelName },
        { $set: meta },
        { upsert: true }
      );

      this.modelMetas.set(meta.modelName, meta);
      console.log(`💾 Saved model metadata for: ${meta.modelName}`);
    } catch (error) {
      console.error(
        `Failed to save model metadata for ${meta.modelName}:`,
        error
      );
      throw error;
    }
  }

  getModelMeta(modelName: string): ModelMeta | undefined {
    return this.modelMetas.get(modelName);
  }

  getAllModelNames(): string[] {
    return Array.from(this.modelMetas.keys());
  }

  getCollection<T extends BSON.Document>(modelName: string): Collection<T> {
    if (!this.db) throw new Error("Database not connected");
    return this.db.collection<T>(modelName);
  }
}
