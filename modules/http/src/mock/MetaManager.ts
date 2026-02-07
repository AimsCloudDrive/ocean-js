import { Collection } from "@msom/common";
import {
  Meta,
  MetaType,
  ModelMeta,
  RelationshipMeta,
  InheritanceMeta,
  MetaCollectionName,
  MetaStatus,
} from "./meta";
import { DB } from "./DB";

export class MetaManager {
  declare private metas: Collection<Meta>;
  declare private db: DB;
  declare private current: Promise<any>;
  constructor(db: DB) {
    if (db.isConnected) {
      this.db = db;
      this.current = Promise.resolve();
    } else {
      this.current = db.connect().then(
        () => (this.db = db),
        () => {},
      );
    }

    this.link(this.initMeta);
  }
  private link(callback: () => void) {
    this.current = this.current.finally(async () => {
      await this.db.checkConnection();
      await Promise.resolve(callback.call(this));
    });
  }
  private async initMeta() {
    this.metas = new Collection<Meta>((meta) => meta.meta_id);
    const collection = this.db.getCollection<Meta>(MetaCollectionName);
    collection.find().map((meta) => this.metas.add(meta));
  }

  async saveMeta(meta: Meta) {
    this.link(async () => {
      const meta_c = this.db.getCollection<Meta>(MetaCollectionName);
      switch (meta.meta_status) {
        case MetaStatus.Draft: {
          return;
        }
        case MetaStatus.Create: {
          await meta_c.insertOne(meta);
          break;
        }
        case MetaStatus.Delete: {
          await meta_c.deleteOne({ meta_id: meta.meta_id });
          break;
        }
        case MetaStatus.Update: {
          await meta_c.updateOne({ meta_id: meta.meta_id }, { $set: meta });
          break;
        }
      }
      this.initMeta();
    });
  }
}
