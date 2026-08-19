import type { Db } from "mongodb";
import { AppError, assertPayload } from "../utils/errors.js";
import type { ModelMeta, Point } from "../types.js";
import { DELETED_COLLECTION, META_COLLECTION, MetaRepository } from "../repositories/meta.repository.js";

const RESERVED_MODEL_IDS = new Set([META_COLLECTION, DELETED_COLLECTION]);
const MODEL_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function isPoint(value: unknown): value is Point {
  const point = value as Point;
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function validateFields(fields: unknown): asserts fields is Array<Record<string, unknown>> {
  assertPayload(Array.isArray(fields), "fields 必须是数组");
  const names = new Set<string>();
  for (const field of fields) {
    const name = (field as Record<string, unknown>)?.name;
    assertPayload(typeof name === "string" && name.trim().length > 0, "字段 name 必填");
    if (names.has(name)) throw new AppError(409, "FIELD_NAME_EXISTS", `字段名 ${name} 重复`);
    names.add(name);
  }
}

export class ModelService {
  constructor(private readonly db: Db, private readonly repository: MetaRepository) {}

  async list(includeInheritedFields = true): Promise<ModelMeta[]> {
    const models = await this.repository.listModels();
    if (!includeInheritedFields) return models;
    const byId = new Map(models.map((item) => [item.model.id, item]));
    return models.map((item) => {
      const inherited: Array<Record<string, unknown>> = [];
      const visited = new Set<string>();
      let parentId = item.model.parentModelId;
      while (parentId && !visited.has(parentId)) {
        visited.add(parentId);
        const parent = byId.get(parentId);
        if (!parent) break;
        inherited.unshift(...parent.fields.map((field) => ({ ...field, inherited: true, fromModelId: parentId })));
        parentId = parent.model.parentModelId;
      }
      return { ...item, fields: [...inherited, ...item.fields] };
    });
  }

  /** 查询单个模型，返回含继承字段的最新数据。模型不存在时抛出 404。 */
  async getById(id: string): Promise<ModelMeta> {
    const found = await this.repository.findModel(id);
    if (!found) throw new AppError(404, "MODEL_NOT_FOUND", "模型不存在");
    const models = await this.repository.listModels();
    const byId = new Map(models.map((item) => [item.model.id, item]));
    const inherited: Array<Record<string, unknown>> = [];
    const visited = new Set<string>();
    let parentId = found.model.parentModelId;
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      inherited.unshift(...parent.fields.map((field) => ({ ...field, inherited: true, fromModelId: parentId })));
      parentId = parent.model.parentModelId;
    }
    return { ...found, fields: [...inherited, ...found.fields] };
  }

  async create(payload: unknown): Promise<ModelMeta> {
    const body = payload as Partial<ModelMeta>;
    const model = body?.model;
    assertPayload(model && typeof model.id === "string" && typeof model.name === "string", "model.id 和 model.name 必填");
    assertPayload(MODEL_ID_PATTERN.test(model.id), "model.id 仅允许字母、数字、下划线和短横线");
    assertPayload(!RESERVED_MODEL_IDS.has(model.id), "model.id 不能使用保留集合名");
    assertPayload(isPoint(body.position), "position 必须包含有效的 x、y");
    validateFields(body.fields);
    if (await this.repository.findModel(model.id)) throw new AppError(409, "MODEL_ID_EXISTS", "模型 ID 已存在");

    const document: ModelMeta = {
      META_TYPE: "model",
      model: { ...model, parentModelId: null, childModelIds: [] },
      fields: body.fields,
      position: body.position,
    };
    await this.repository.insertModel(document);
    const collections = await this.db.listCollections({ name: model.id }, { nameOnly: true }).toArray();
    if (collections.length === 0) await this.db.createCollection(model.id);
    return document;
  }

  async update(id: string, payload: unknown): Promise<ModelMeta> {
    const current = await this.repository.findModel(id);
    if (!current) throw new AppError(404, "MODEL_NOT_FOUND", "模型不存在");
    const body = payload as Partial<ModelMeta>;
    const incomingFields = body.fields !== undefined
      ? (body.fields as Array<Record<string, unknown>>).filter((f) => !f.inherited)
      : undefined;
    if (incomingFields !== undefined) {
      validateFields(incomingFields);
      if (current.model.parentModelId) {
        const models = await this.repository.listModels();
        const byId = new Map(models.map((m) => [m.model.id, m]));
        const inheritedNames = new Set<string>();
        const visited = new Set<string>();
        let parentId = current.model.parentModelId;
        while (parentId && !visited.has(parentId)) {
          visited.add(parentId);
          const parent = byId.get(parentId);
          if (!parent) break;
          for (const f of parent.fields) {
            const fn = (f as Record<string, unknown>)?.name;
            if (typeof fn === "string") inheritedNames.add(fn);
          }
          parentId = parent.model.parentModelId;
        }
        for (const f of incomingFields) {
          const name = (f as Record<string, unknown>)?.name as string;
          if (inheritedNames.has(name)) {
            throw new AppError(409, "FIELD_NAME_EXISTS", `字段名 ${name} 与继承字段重复`);
          }
        }
      }
    }
    if (body.position !== undefined) assertPayload(isPoint(body.position), "position 必须包含有效的 x、y");
    const modelPatch = body.model ?? {};
    assertPayload(!("id" in modelPatch || "parentModelId" in modelPatch || "childModelIds" in modelPatch), "模型 ID 和继承字段不能直接修改");
    const updated: ModelMeta = {
      ...current,
      model: { ...current.model, ...modelPatch },
      fields: incomingFields ?? current.fields.filter((f) => !f.inherited),
      position: body.position ?? current.position,
    };
    await this.repository.replaceModel(id, updated);
    return updated;
  }
}
