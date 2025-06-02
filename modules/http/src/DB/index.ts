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
  async updateRelate(
    sourceCollectionName: string,
    relate: CollectionMeta["relates"][0],
    option?: boolean | { add?: boolean }
  ) {
    const meta = await this.getCollectionMetaData(sourceCollectionName);
    if (!meta) {
      return this.setCollectionMetaData({
        collectionName: sourceCollectionName,
        relates: [relate],
      });
    } else {
      const existRelateIndex = meta.relates.findIndex(
        ({ relateName }) => relateName === relate.relateName
      );
      if ((typeof option === "object" ? option.add : option) !== false) {
        meta.relates.splice(
          existRelateIndex === -1 ? meta.relates.length : existRelateIndex,
          1,
          relate
        );
      } else {
        meta.relates = [relate];
      }
      return this.setCollectionMetaData(meta);
    }
  }
  async updateProps(
    sourceCollectionName: string,
    ...props: CollectionMeta["props"]
  ) {
    const meta = await this.getCollectionMetaData(sourceCollectionName);
    if (!meta) {
      return this.setCollectionMetaData({
        collectionName: sourceCollectionName,
        props,
      });
    } else {
      const newPropIndexs = this.checkProps(props);
      const length = meta.props.length;
      for (let i = 0; i < length; i++) {
        const { prop } = meta.props[i];
        const newPropIndex = newPropIndexs.get(prop.name);
        if (newPropIndex != undefined) {
          meta.props.splice(i, 1, props[newPropIndex]);
          newPropIndexs.delete(prop.name);
        }
      }
      newPropIndexs.forEach((propIndex) => {
        meta.props.push(props[propIndex]);
      });
      return this.setCollectionMetaData(meta);
    }
  }
  fillMate(meta: NotFilledCollectionMeta): CollectionMeta {
    return {
      props: [],
      extends: [],
      relates: [],
      collectionName: meta.collectionName,
    };
  }
  private checkProps(props: CollectionMeta["props"]) {
    const propIndexs = new Map<string, number>();

    for (let index = 0; index < props.length; index++) {
      const { prop } = props[index];
      if (propIndexs.has(prop.name)) {
        throw Error("has repeat propName!");
      }
      propIndexs.set(prop.name, index);
    }
    return propIndexs;
  }
}
