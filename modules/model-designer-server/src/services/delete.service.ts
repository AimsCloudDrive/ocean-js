import type { Db, MongoClient, ObjectId, UpdateFilter } from "mongodb";
import { DELETED_COLLECTION, MetaRepository } from "../repositories/meta.repository.js";
import type { ModelMeta, RelationMeta } from "../types.js";
import { AppError } from "../utils/errors.js";
import { runWithTransaction } from "../utils/transaction.js";

export interface SelectionDeletePayload {
  modelIds: string[];
  relationIds: string[];
  deleteChildModels: boolean;
}

export function resolveDeleteIds(models: ModelMeta[], requestedIds: string[], deleteChildModels: boolean): string[] {
  const byId = new Map(models.map((item) => [item.model.id, item]));
  const selected = new Set(requestedIds);
  for (const id of requestedIds) {
    if (!byId.has(id)) throw new AppError(404, "MODEL_NOT_FOUND", `模型 ${id} 不存在`);
  }
  if (deleteChildModels) {
    const queue = [...selected];
    while (queue.length) {
      const id = queue.shift()!;
      for (const child of byId.get(id)?.model.childModelIds ?? []) {
        if (!selected.has(child)) { selected.add(child); queue.push(child); }
      }
    }
  } else {
    for (const id of selected) {
      const missing = (byId.get(id)?.model.childModelIds ?? []).filter((child) => !selected.has(child));
      if (missing.length) throw new AppError(409, "MODEL_HAS_CHILDREN", "模型存在未一起删除的继承子模型", { modelId: id, childModelIds: missing });
    }
  }
  return [...selected];
}

function touchesModels(relation: RelationMeta, ids: Set<string>): boolean {
  if (relation.source && ids.has(relation.source)) return true;
  if (relation.target && ids.has(relation.target)) return true;
  return Object.values(relation.relationship ?? {}).some((item) => ids.has(item.source as string) || ids.has(item.target as string));
}

export class DeleteService {
  constructor(private readonly client: MongoClient, private readonly db: Db, private readonly repository: MetaRepository) {}

  async deleteModels(requestedIds: string[], deleteChildModels: boolean): Promise<{ modelIds: string[]; relationIds: string[] }> {
    return this.deleteSelection({ modelIds: requestedIds, relationIds: [], deleteChildModels });
  }

  async deleteSelection(payload: SelectionDeletePayload): Promise<{ modelIds: string[]; relationIds: string[] }> {
    const models = await this.repository.listModels();
    const modelIds = resolveDeleteIds(models, payload.modelIds, payload.deleteChildModels);
    const modelSet = new Set(modelIds);
    const relations = await this.repository.listRelations();
    const relatedIds = relations.filter((item) => touchesModels(item, modelSet)).map((item) => item.id);
    const requestedRelationIds = payload.relationIds.filter((id) => !relatedIds.includes(id));
    const knownRelations = new Set(relations.map((item) => item.id));
    const missingRelation = requestedRelationIds.find((id) => !knownRelations.has(id));
    if (missingRelation) throw new AppError(404, "RELATION_NOT_FOUND", `关系 ${missingRelation} 不存在`);
    const relationIds = [...new Set([...relatedIds, ...requestedRelationIds])];

    const existingCollections = new Set(
      (await this.db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name),
    );

    await runWithTransaction(
      this.client,
      async (session) => {
        for (const modelId of modelIds) {
          if (!existingCollections.has(modelId)) continue;
          const documents = await this.db.collection(modelId).find({}, { session }).toArray();
          if (documents.length) {
            await this.db.collection(DELETED_COLLECTION).insertMany(documents.map((data) => ({ source: modelId, data })), { session });
          }
        }
        await this.repository.deleteRelations(relationIds, session);
        for (const relation of relations.filter((item) => item.relationType === "inherit" && relationIds.includes(item.id))) {
          if (relation.source && !modelSet.has(relation.source)) await this.repository.updateModel(relation.source, { $set: { "model.parentModelId": null } }, session);
          if (relation.target && !modelSet.has(relation.target) && relation.source) await this.repository.removeChildModel(relation.target, relation.source, session);
        }
        await this.repository.deleteModels(modelIds, session);
        for (const modelId of modelIds) {
          if (existingCollections.has(modelId)) await this.db.collection(modelId).drop({ session });
        }
      },
      () => this.deleteSelectionWithoutTransaction({ models, relations, modelIds, relationIds, existingCollections }),
    );
    return { modelIds, relationIds };
  }

  /**
   * 无事务补偿删除模型：转移文档到 __DETELED_DATAS__（{source, data}）→ 清理关系 →
   * 恢复被删模型影响到的继承引用 → 删除模型元数据 → drop 集合，任一步失败回滚已做步骤。
   */
  private async deleteSelectionWithoutTransaction(params: {
    models: ModelMeta[];
    relations: RelationMeta[];
    modelIds: string[];
    relationIds: string[];
    existingCollections: Set<string>;
  }): Promise<void> {
    const { models, relations, modelIds, relationIds, existingCollections } = params;
    const modelSet = new Set(modelIds);
    const movedIds: ObjectId[] = [];
    let stepsDone = 0;
    try {
      // 步骤 1：转移文档到 __DETELED_DATAS__，记录本次插入的 _id 以便精确撤回
      for (const modelId of modelIds) {
        if (!existingCollections.has(modelId)) continue;
        const documents = await this.db.collection(modelId).find({}).toArray();
        if (documents.length) {
          const result = await this.db.collection(DELETED_COLLECTION).insertMany(documents.map((data) => ({ source: modelId, data })));
          movedIds.push(...Object.values(result.insertedIds));
        }
      }
      stepsDone = 1;
      // 步骤 2：清理与被删模型相关的关系
      await this.repository.deleteRelations(relationIds);
      stepsDone = 2;
      // 步骤 3：恢复被删模型影响到的继承引用（未删除模型的 parentModelId / childModelIds）
      for (const relation of relations.filter((item) => item.relationType === "inherit" && relationIds.includes(item.id))) {
        if (relation.source && !modelSet.has(relation.source)) await this.repository.updateModel(relation.source, { $set: { "model.parentModelId": null } });
        if (relation.target && !modelSet.has(relation.target) && relation.source) await this.repository.removeChildModel(relation.target, relation.source);
      }
      stepsDone = 3;
      // 步骤 4：删除模型元数据
      await this.repository.deleteModels(modelIds);
      stepsDone = 4;
      // 步骤 5：drop 集合
      for (const modelId of modelIds) {
        if (existingCollections.has(modelId)) await this.db.collection(modelId).drop();
      }
      stepsDone = 5;
    } catch (error) {
      await this.rollbackDeleteSelection({ models, relations, modelIds, relationIds, modelSet, movedIds, stepsDone });
      throw error;
    }
  }

  /** 回滚模型删除：按已完成步骤反向恢复（尽力而为，不掩盖原始错误）。 */
  private async rollbackDeleteSelection(params: {
    models: ModelMeta[];
    relations: RelationMeta[];
    modelIds: string[];
    relationIds: string[];
    modelSet: Set<string>;
    movedIds: ObjectId[];
    stepsDone: number;
  }): Promise<void> {
    const { models, relations, modelIds, relationIds, modelSet, movedIds, stepsDone } = params;
    // 步骤 5 失败：恢复模型元数据（先清残余再重新插入）
    if (stepsDone >= 4) {
      await this.repository.deleteModels(modelIds).catch(() => undefined);
      for (const modelId of modelIds) {
        const original = models.find((item) => item.model.id === modelId);
        if (original) await this.repository.insertModel(original).catch(() => undefined);
      }
    }
    // 步骤 3 失败：撤销对未删除模型的继承引用修改
    if (stepsDone >= 3) {
      for (const relation of relations.filter((item) => item.relationType === "inherit" && relationIds.includes(item.id))) {
        if (relation.source && !modelSet.has(relation.source)) {
          await this.repository.updateModel(relation.source, { $set: { "model.parentModelId": relation.target } }).catch(() => undefined);
        }
        if (relation.target && !modelSet.has(relation.target) && relation.source) {
          await this.repository.updateModel(relation.target, { $addToSet: { "model.childModelIds": relation.source } } as UpdateFilter<ModelMeta>).catch(() => undefined);
        }
      }
    }
    // 步骤 2 失败：恢复关系文档（先清残余再重新插入）
    if (stepsDone >= 2) {
      await this.repository.deleteRelations(relationIds).catch(() => undefined);
      for (const relation of relations.filter((item) => relationIds.includes(item.id))) {
        await this.repository.insertRelation(relation).catch(() => undefined);
      }
    }
    // 步骤 1 失败：从 __DETELED_DATAS__ 撤回本次已转移的文档
    if (stepsDone >= 1 && movedIds.length > 0) {
      await this.db.collection(DELETED_COLLECTION).deleteMany({ _id: { $in: movedIds } }).catch(() => undefined);
    }
  }
}
