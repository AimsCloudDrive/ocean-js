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

interface CollectionMeta {
  collectionName: string;
  relates: {
    relateName: string;
    collectionName: string;
    relate: "1" | "n";
    description: {
      desc: string;
    };
  }[];
  extends: {
    collectionName: string;
  }[];
  props: {
    prop: {
      name: string;
      type: string;
    };
    description: {
      alise: string;
      desc: string;
    };
  }[];
}

type NotFilledCollectionMeta = Omit<Partial<CollectionMeta>, "collectionName"> &
  Pick<CollectionMeta, "collectionName">;

export class Db extends _Db {
  private get metaCollection() {
    return super.collection<CollectionMeta>("__meta");
  }
  collection<TSchema extends Document = Document>(
    name: string,
    options?: CollectionOptions | undefined,
    meta?: NotFilledCollectionMeta
  ): _Collection<TSchema> {
    const _collection = super.collection<TSchema>(name, options);
    const metas = this.getCollectionMetaData<undefined>();
    metas.then((metas) => {
      if (meta && !metas.some((c) => c.collectionName === name)) {
        this.setCollectionMetaData(meta);
      }
    });
    return _collection;
  }
  async createCollection<TSchema extends Document = Document>(
    name: string,
    options?: CreateCollectionOptions | undefined,
    meta?: NotFilledCollectionMeta
  ): Promise<_Collection<TSchema>> {
    const _meta = await this.getCollectionMetaData(name);
    if (!_meta && meta) {
      if (
        !(await this.setCollectionMetaData({ ...meta, collectionName: name }))
      ) {
        throw new Error("set meta Error");
      }
    }
    return super.createCollection(name, options);
  }
  async getCollectionMetaData<
    CName extends string | undefined,
    R = CName extends string
      ? WithId<CollectionMeta> | null
      : WithId<CollectionMeta>[]
  >(collectionName?: CName): Promise<R> {
    if (!collectionName) {
      return (await this.metaCollection.find().toArray()) as R;
    } else {
      return (await this.metaCollection.findOne({
        collectionName: { $eq: collectionName },
      })) as R;
    }
  }
  async setCollectionMetaData(meta: NotFilledCollectionMeta) {
    const res = await this.metaCollection.updateOne(
      {
        collectionName: meta.collectionName,
      },
      {
        $set: meta,
      },
      {
        upsert: true,
      }
    );
    return !!(res.matchedCount + res.modifiedCount + res.upsertedCount);
  }
  private async __update<K extends "props" | "relates" | "extends">(
    sourceCollectionName: string,
    metaKey: K,
    getKey: (data: CollectionMeta[K][0], index: number) => string,
    news: CollectionMeta[K]
  ) {
    const meta = await this.getCollectionMetaData(sourceCollectionName);
    if (!meta) {
      return this.setCollectionMetaData({
        collectionName: sourceCollectionName,
        [metaKey]: news,
      });
    } else {
      type UnionToIntersection = ((
        k: CollectionMeta["extends" | "props" | "relates"]
      ) => void) extends (k: Array<infer I>) => void
        ? I
        : never;
      const newIndexs = this.check(news, getKey);
      const length = meta[metaKey].length;
      for (let i = 0; i < length; i++) {
        const k = getKey(meta[metaKey][i], i);
        const newIndex = newIndexs.get(k);
        if (newIndex != undefined) {
          meta[metaKey].splice(i, 1, news[newIndex] as UnionToIntersection);
          newIndexs.delete(k);
        }
      }
      newIndexs.forEach((newIndex) => {
        meta[metaKey].push(news[newIndex] as UnionToIntersection);
      });
      return this.setCollectionMetaData(meta);
    }
  }
  updateRelates(
    sourceCollectionName: string,
    ...relates: CollectionMeta["relates"]
  ) {
    return this.__update(
      sourceCollectionName,
      "relates",
      ({ relateName }) => relateName,
      relates
    );
  }
  updateProps(sourceCollectionName: string, ...props: CollectionMeta["props"]) {
    return this.__update(
      sourceCollectionName,
      "props",
      ({ prop }) => prop.name,
      props
    );
  }
  updateExtends(
    sourceCollectionName: string,
    ..._extends: CollectionMeta["extends"]
  ) {
    return this.__update(
      sourceCollectionName,
      "extends",
      ({ collectionName }) => collectionName,
      _extends
    );
  }
  fillMate(meta: NotFilledCollectionMeta): CollectionMeta {
    return {
      props: [],
      extends: [],
      relates: [],
      collectionName: meta.collectionName,
    };
  }
  private check<T extends unknown[]>(
    props: T,
    getKey: <N extends number>(data: T[N], index: N) => string
  ) {
    const propIndexs = new Map<string, number>();

    for (let index = 0; index < props.length; index++) {
      const key = getKey(props[index], index);
      if (propIndexs.has(key)) {
        throw Error("has repeat propName!");
      }
      propIndexs.set(key, index);
    }
    return propIndexs;
  }
}
