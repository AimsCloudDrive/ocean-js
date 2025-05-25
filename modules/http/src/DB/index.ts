import {
  CollectionOptions,
  CreateCollectionOptions,
  DbOptions,
  Document,
  WithId,
  Collection as _Collection,
  Db as _Db,
  MongoClient as _MongoClient,
} from "mongodb";

export class MongoClient extends _MongoClient {
  db(dbName: string, options?: DbOptions | undefined): Db {
    return new Db(this, dbName, options);
  }
}

interface __Meta {
  collectionName: string;
  relates: {
    relateName: string;
    collectionName: string;
    relate: "1" | "n";
    description: {
      desc: string;
    };
  }[];
  props: {
    propName: string;
    propType: string;
    description: {
      alise: string;
      desc: string;
    };
  }[];
}

export class Db extends _Db {
  get metaCollection() {
    return super.collection<__Meta>("__meta");
  }
  collection<TSchema extends Document = Document>(
    name: string,
    options?: CollectionOptions | undefined
  ): Collection<TSchema> {}
  async createCollection<TSchema extends Document = Document>(
    name: string,
    options?: CreateCollectionOptions | undefined,
    meta?: Omit<__Meta, "collectionName">
  ): Promise<_Collection<TSchema>> {
    const _meta = await this.getCollectionMetaData(name);
    if (!_meta && meta) {
      if (await this.setCollectionMetaData({ ...meta, collectionName: name })) {
        return await super.createCollection(name, options);
      } else {
        throw new Error("set meta Error");
      }
    }
    return super.collection(name, options);
  }
  async getCollectionMetaData<
    CName extends string | undefined,
    R = CName extends string ? WithId<__Meta> | null : WithId<__Meta>[]
  >(cName?: CName): Promise<R> {
    if (!cName) {
      return (await this.metaCollection.find().toArray()) as R;
    } else {
      return (await this.metaCollection.findOne({
        collectionName: { $eq: cName },
      })) as R;
    }
  }
  async setCollectionMetaData(__meta: __Meta) {
    const res = await this.metaCollection.updateOne(
      {
        collectionName: __meta.collectionName,
      },
      {
        $set: __meta,
      },
      {
        upsert: true,
      }
    );
    return !!(res.matchedCount + res.modifiedCount + res.upsertedCount);
  }
}
