import { randomUUID } from "node:crypto";
import type { ClientSession, MongoClient } from "mongodb";
import { MetaRepository } from "../repositories/meta.repository.js";
import type { ModelMeta, Point, RelationMeta } from "../types.js";
import { AppError, assertPayload } from "../utils/errors.js";
import { runWithTransaction } from "../utils/transaction.js";
import { createsInheritanceCycle } from "./inheritance.js";

function isPoint(value: unknown): value is Point {
  const point = value as Point;
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

export class RelationService {
  constructor(private readonly client: MongoClient, private readonly repository: MetaRepository) {}

  async create(payload: unknown): Promise<RelationMeta> {
    const body = payload as Partial<RelationMeta>;
    assertPayload(body?.relationType === "relation" || body?.relationType === "inherit", "relationType 必须是 relation 或 inherit");
    const id = `rel_${randomUUID()}`;
    if (body.relationType === "inherit") return this.createInheritance(id, body);
    assertPayload(body.relationship && Object.keys(body.relationship).length === 2, "普通关系必须包含双向 relationship");
    this.assertEditableFields(body);
    const relation: RelationMeta = {
      META_TYPE: "relation",
      id,
      relationType: "relation",
      relationship: body.relationship,
      position: body.position,
      name: body.name,
      kind: body.kind,
      locked: body.locked,
      data: body.data,
    };
    await this.assertRelationshipModels(relation);
    await this.repository.insertRelation(relation);
    return relation;
  }

  private async createInheritance(id: string, body: Partial<RelationMeta>): Promise<RelationMeta> {
    assertPayload(typeof body.source === "string" && typeof body.target === "string", "继承关系 source 和 target 必填");
    const models = await this.repository.listModels();
    const source = models.find((item) => item.model.id === body.source);
    const target = models.find((item) => item.model.id === body.target);
    if (!source || !target) throw new AppError(404, "MODEL_NOT_FOUND", "继承关系中的模型不存在");
    if (source.model.parentModelId) throw new AppError(409, "MODEL_PARENT_EXISTS", "子模型已经存在父模型");
    // 成环检测必须在任何数据库写入/事务之前完成，返回 400 INHERIT_CYCLE
    if (createsInheritanceCycle(models, body.source, body.target)) {
      throw new AppError(400, "INHERIT_CYCLE", "创建继承关系会形成环", { sourceModelId: body.source, targetModelId: body.target });
    }

    const relation: RelationMeta = { META_TYPE: "relation", id, relationType: "inherit", source: body.source, target: body.target };
    const sourceId = body.source;
    const targetId = body.target;
    const sourceWithParent: ModelMeta = { ...source, model: { ...source.model, parentModelId: targetId } };
    const targetWithChild: ModelMeta = {
      ...target,
      model: { ...target.model, childModelIds: [...new Set([...target.model.childModelIds, sourceId])] },
    };

    return runWithTransaction(
      this.client,
      async (session) => {
        await this.repository.insertRelation(relation, session);
        await this.repository.replaceModel(sourceId, sourceWithParent, session);
        await this.repository.replaceModel(targetId, targetWithChild, session);
        return relation;
      },
      () => this.createInheritanceWithoutTransaction(relation, sourceId, sourceWithParent, targetId, targetWithChild),
    );
  }

  /** 无事务补偿：插入关系文档 → 更新子模型 parentModelId → 父模型 childModelIds 追加，任一步失败回滚已做步骤。 */
  private async createInheritanceWithoutTransaction(
    relation: RelationMeta,
    sourceId: string,
    sourceWithParent: ModelMeta,
    targetId: string,
    targetWithChild: ModelMeta,
  ): Promise<RelationMeta> {
    let stepsDone = 0;
    try {
      await this.repository.insertRelation(relation); // 步骤 1：插入关系文档
      stepsDone = 1;
      if (!(await this.repository.replaceModel(sourceId, sourceWithParent))) {
        throw new AppError(409, "MODEL_CONFLICT", `子模型 ${sourceId} 不存在或已被修改`);
      }
      stepsDone = 2;
      if (!(await this.repository.replaceModel(targetId, targetWithChild))) {
        throw new AppError(409, "MODEL_CONFLICT", `父模型 ${targetId} 不存在或已被修改`);
      }
      stepsDone = 3;
    } catch (error) {
      await this.rollbackCreateInheritance(relation, sourceId, stepsDone);
      throw error;
    }
    return relation;
  }

  /** 回滚继承创建：恢复子模型 parentModelId、删除已插入的关系文档（尽力而为，不掩盖原始错误）。 */
  private async rollbackCreateInheritance(relation: RelationMeta, sourceId: string, stepsDone: number): Promise<void> {
    if (stepsDone >= 2) {
      await this.repository.updateModel(sourceId, { $set: { "model.parentModelId": null } }).catch(() => undefined);
    }
    if (stepsDone >= 1) {
      await this.repository.deleteRelations([relation.id]).catch(() => undefined);
    }
  }

  async update(id: string, payload: unknown): Promise<RelationMeta> {
    const current = await this.repository.findRelation(id);
    if (!current) throw new AppError(404, "RELATION_NOT_FOUND", "关系不存在");
    if (current.relationType === "inherit") throw new AppError(400, "INVALID_PAYLOAD", "继承关系不支持修改，请删除后重建");
    const body = payload as Partial<RelationMeta>;
    assertPayload(body.relationship === undefined || Object.keys(body.relationship).length === 2, "普通关系必须包含双向 relationship");
    this.assertEditableFields(body);
    const updated: RelationMeta = {
      ...current,
      relationship: body.relationship ?? current.relationship,
      position: body.position ?? current.position,
      name: body.name ?? current.name,
      kind: body.kind ?? current.kind,
      locked: body.locked === undefined ? current.locked : body.locked,
      data: body.data ?? current.data,
    };
    await this.assertRelationshipModels(updated);
    await this.repository.replaceRelation(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await runWithTransaction(
      this.client,
      async (session) => this.deleteInSession(id, session),
      () => this.deleteInheritanceWithoutTransaction(id),
    );
  }

  private async deleteInSession(id: string, session: ClientSession): Promise<void> {
    const relation = await this.repository.findRelation(id, session);
    if (!relation) throw new AppError(404, "RELATION_NOT_FOUND", "关系不存在");
    if (relation.relationType === "inherit" && relation.source && relation.target) {
      await this.repository.updateModel(relation.source, { $set: { "model.parentModelId": null } }, session);
      await this.repository.removeChildModel(relation.target, relation.source, session);
    }
    await this.repository.deleteRelations([id], session);
  }

  /** 无事务补偿：删除关系文档 → 清除子模型 parentModelId → 父模型 childModelIds 移除，任一步失败回滚已做步骤。 */
  private async deleteInheritanceWithoutTransaction(id: string): Promise<void> {
    const relation = await this.repository.findRelation(id);
    if (!relation) throw new AppError(404, "RELATION_NOT_FOUND", "关系不存在");
    let stepsDone = 0;
    try {
      await this.repository.deleteRelations([id]); // 步骤 1：删除关系文档
      stepsDone = 1;
      if (relation.relationType === "inherit" && relation.source && relation.target) {
        await this.repository.updateModel(relation.source, { $set: { "model.parentModelId": null } }); // 步骤 2：清除子模型父引用
        stepsDone = 2;
        await this.repository.removeChildModel(relation.target, relation.source); // 步骤 3：父模型 childModelIds 移除
        stepsDone = 3;
      }
    } catch (error) {
      await this.rollbackDeleteInheritance(relation, stepsDone);
      throw error;
    }
  }

  /** 回滚继承删除：恢复子模型 parentModelId、重新插入关系文档（尽力而为，不掩盖原始错误）。 */
  private async rollbackDeleteInheritance(relation: RelationMeta, stepsDone: number): Promise<void> {
    if (relation.relationType === "inherit" && relation.source && relation.target) {
      if (stepsDone >= 2) {
        await this.repository.updateModel(relation.source, { $set: { "model.parentModelId": relation.target } }).catch(() => undefined);
      }
    }
    if (stepsDone >= 1) {
      await this.repository.insertRelation(relation).catch(() => undefined);
    }
  }

  private assertEditableFields(body: Partial<RelationMeta>): void {
    assertPayload(body.name === undefined || typeof body.name === "string", "name 必须是字符串");
    assertPayload(
      body.kind === undefined || body.kind === "one-to-one" || body.kind === "one-to-many" || body.kind === "many-to-many",
      "kind 必须是 one-to-one、one-to-many 或 many-to-many",
    );
    assertPayload(body.locked === undefined || typeof body.locked === "boolean", "locked 必须是布尔值");
    assertPayload(body.position === undefined || isPoint(body.position), "position 必须包含有效的 x、y");
  }

  private async assertRelationshipModels(relation: RelationMeta): Promise<void> {
    const entries = Object.values(relation.relationship ?? {});
    assertPayload(entries.every((item) => typeof item.source === "string" && typeof item.target === "string"), "relationship 的 source 和 target 必填");
    const ids = new Set((await this.repository.listModels()).map((item) => item.model.id));
    if (entries.some((item) => !ids.has(item.source as string) || !ids.has(item.target as string))) {
      throw new AppError(404, "MODEL_NOT_FOUND", "普通关系中的模型不存在");
    }
  }
}
