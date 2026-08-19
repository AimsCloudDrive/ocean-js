import type { ClientSession, Db, Filter, OptionalUnlessRequiredId, UpdateFilter } from "mongodb";
import type { CanvasMeta, MetaDocument, ModelMeta, RelationMeta } from "../types.js";

export const META_COLLECTION = "__META__";
export const DELETED_COLLECTION = "__DETELED_DATAS__";

export class MetaRepository {
  constructor(private readonly db: Db) {}

  private get collection() {
    return this.db.collection<MetaDocument>(META_COLLECTION);
  }

  async getCanvas(): Promise<CanvasMeta> {
    const found = await this.collection.findOne({ META_TYPE: "base" }) as CanvasMeta | null;
    return found ?? { META_TYPE: "base", center: { x: 0, y: 0 }, scale: 1 };
  }

  async saveCanvas(canvas: CanvasMeta): Promise<CanvasMeta> {
    await this.collection.replaceOne({ META_TYPE: "base" }, canvas, { upsert: true });
    return canvas;
  }

  async listModels(session?: ClientSession): Promise<ModelMeta[]> {
    return this.collection.find({ META_TYPE: "model" }, { session }).toArray() as Promise<ModelMeta[]>;
  }

  async findModel(id: string, session?: ClientSession): Promise<ModelMeta | null> {
    return this.collection.findOne({ META_TYPE: "model", "model.id": id }, { session }) as Promise<ModelMeta | null>;
  }

  async insertModel(model: ModelMeta): Promise<void> {
    await this.collection.insertOne(model as OptionalUnlessRequiredId<MetaDocument>);
  }

  async replaceModel(id: string, model: ModelMeta, session?: ClientSession): Promise<boolean> {
    const result = await this.collection.replaceOne({ META_TYPE: "model", "model.id": id }, model, { session });
    return result.matchedCount === 1;
  }

  async updateModel(id: string, update: UpdateFilter<MetaDocument>, session?: ClientSession): Promise<void> {
    await this.collection.updateOne({ META_TYPE: "model", "model.id": id }, update, { session });
  }

  async removeChildModel(id: string, childId: string, session?: ClientSession): Promise<void> {
    const schema = { model: { id: "", childModelIds: [] as string[] } };
    await this.db.collection<typeof schema>(META_COLLECTION).updateOne(
      { "model.id": id },
      { $pull: { "model.childModelIds": childId } } as UpdateFilter<typeof schema>,
      { session },
    );
  }

  async deleteModels(ids: string[], session?: ClientSession): Promise<void> {
    await this.collection.deleteMany({ META_TYPE: "model", "model.id": { $in: ids } } as Filter<MetaDocument>, { session });
  }

  async listRelations(session?: ClientSession): Promise<RelationMeta[]> {
    const docs = await this.collection.find({ META_TYPE: "relation" }, { session }).toArray();
    return docs.map((doc) => ({ ...doc, locked: !!doc.position })) as RelationMeta[];
  }

  async findRelation(id: string, session?: ClientSession): Promise<RelationMeta | null> {
    const doc = await this.collection.findOne({ META_TYPE: "relation", id }, { session });
    if (!doc) return null;
    return { ...doc, locked: !!doc.position } as RelationMeta;
  }

  async insertRelation(relation: RelationMeta, session?: ClientSession): Promise<void> {
    await this.collection.insertOne(relation as OptionalUnlessRequiredId<MetaDocument>, { session });
  }

  async replaceRelation(id: string, relation: RelationMeta): Promise<boolean> {
    const result = await this.collection.replaceOne({ META_TYPE: "relation", id }, relation);
    return result.matchedCount === 1;
  }

  async deleteRelations(ids: string[], session?: ClientSession): Promise<void> {
    if (ids.length === 0) return;
    await this.collection.deleteMany({ META_TYPE: "relation", id: { $in: ids } } as Filter<MetaDocument>, { session });
  }
}
