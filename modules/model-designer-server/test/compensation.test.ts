import assert from "node:assert/strict";
import test from "node:test";
import type { Db, MongoClient } from "mongodb";
import { DeleteService } from "../src/services/delete.service.js";
import { RelationService } from "../src/services/relation.service.js";
import type { ModelMeta, RelationMeta } from "../src/types.js";

/** MongoDB 单机实例：启动事务即抛 "Transaction numbers" 错误。 */
function standaloneClient(): MongoClient {
  const session = {
    withTransaction: async () => {
      throw new Error("Transaction numbers are only allowed on a replica set member or mongos");
    },
    endSession: async () => undefined,
  };
  return { startSession: () => session } as unknown as MongoClient;
}

/** 支持事务的客户端。 */
function transactionClient(): MongoClient {
  const session = {
    withTransaction: async (fn: (s: unknown) => Promise<unknown>) => fn({}),
    endSession: async () => undefined,
  };
  return { startSession: () => session } as unknown as MongoClient;
}

/** 事务抛出任意错误的客户端（用于验证非降级错误照常抛出）。 */
function failingClient(error: Error): MongoClient {
  const session = {
    withTransaction: async () => {
      throw error;
    },
    endSession: async () => undefined,
  };
  return { startSession: () => session } as unknown as MongoClient;
}

function model(id: string, parentModelId: string | null = null): ModelMeta {
  return {
    META_TYPE: "model",
    model: { id, name: id, parentModelId, childModelIds: [] },
    fields: [],
    position: { x: 0, y: 0 },
  };
}

class RepositoryStub {
  calls: string[] = [];
  models: ModelMeta[] = [];
  relations: RelationMeta[] = [];
  failOn?: (method: string, ...args: unknown[]) => Error | undefined;

  private async track(method: string, ...args: unknown[]): Promise<void> {
    this.calls.push(method);
    const error = this.failOn?.(method, ...args);
    if (error) throw error;
  }

  async listModels(): Promise<ModelMeta[]> {
    await this.track("listModels");
    return this.models;
  }

  async listRelations(): Promise<RelationMeta[]> {
    await this.track("listRelations");
    return this.relations;
  }

  async findRelation(id: string): Promise<RelationMeta | null> {
    await this.track("findRelation", id);
    return this.relations.find((item) => item.id === id) ?? null;
  }

  async insertRelation(relation: RelationMeta): Promise<void> {
    await this.track("insertRelation", relation);
    this.relations.push(relation);
  }

  async replaceModel(id: string, next: ModelMeta): Promise<boolean> {
    await this.track("replaceModel", id, next);
    const index = this.models.findIndex((item) => item.model.id === id);
    if (index === -1) return false;
    this.models[index] = next;
    return true;
  }

  async updateModel(id: string, update: { $set?: Record<string, unknown>; $addToSet?: Record<string, unknown> }): Promise<void> {
    await this.track("updateModel", id, update);
    const found = this.models.find((item) => item.model.id === id);
    if (!found || !update.$set) return;
    if ("model.parentModelId" in update.$set) found.model.parentModelId = update.$set["model.parentModelId"] as string | null;
    if ("model.childModelIds" in update.$set) found.model.childModelIds = update.$set["model.childModelIds"] as string[];
  }

  async removeChildModel(id: string, childId: string): Promise<void> {
    await this.track("removeChildModel", id, childId);
    const found = this.models.find((item) => item.model.id === id);
    if (found) found.model.childModelIds = found.model.childModelIds.filter((child) => child !== childId);
  }

  async deleteRelations(ids: string[]): Promise<void> {
    await this.track("deleteRelations", ids);
    this.relations = this.relations.filter((item) => !ids.includes(item.id));
  }

  async deleteModels(ids: string[]): Promise<void> {
    await this.track("deleteModels", ids);
    this.models = this.models.filter((item) => !ids.includes(item.model.id));
  }

  async insertModel(next: ModelMeta): Promise<void> {
    await this.track("insertModel", next);
    this.models.push(next);
  }
}

class DbStub {
  calls: string[] = [];
  collections = new Map<string, unknown[]>();
  failOn?: (method: string) => Error | undefined;

  listCollections(): { toArray(): Promise<Array<{ name: string }>> } {
    return { toArray: async () => [...this.collections.keys()].map((name) => ({ name })) };
  }

  collection(name: string) {
    const self = this;
    return {
      find: () => ({ toArray: async () => self.collections.get(name) ?? [] }),
      insertMany: async (docs: unknown[]) => {
        self.calls.push(`insertMany:${name}`);
        const error = self.failOn?.(`insertMany:${name}`);
        if (error) throw error;
        const withIds = docs.map((doc, index) => ({ ...(doc as object), _id: index }));
        self.collections.set(name, [...(self.collections.get(name) ?? []), ...withIds]);
        return { insertedIds: withIds.map((doc) => (doc as { _id: number })._id) };
      },
      deleteMany: async (filter: { _id?: { $in: unknown[] } }) => {
        self.calls.push(`deleteMany:${name}`);
        const error = self.failOn?.(`deleteMany:${name}`);
        if (error) throw error;
        const ids = filter._id?.$in ?? [];
        self.collections.set(name, (self.collections.get(name) ?? []).filter((doc) => !ids.includes((doc as { _id: unknown })._id)));
        return { deletedCount: 0 };
      },
      drop: async () => {
        self.calls.push(`drop:${name}`);
        const error = self.failOn?.(`drop:${name}`);
        if (error) throw error;
        self.collections.delete(name);
      },
    };
  }
}

// ---------------- 继承创建补偿 ----------------

test("继承创建补偿：插入关系→更新子模型→追加父模型 childModelIds", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user"), model("order")];
  const service = new RelationService(standaloneClient(), repository as never);

  const result = await service.create({ relationType: "inherit", source: "user", target: "order" });

  assert.equal(result.relationType, "inherit");
  assert.deepEqual(repository.calls, ["listModels", "insertRelation", "replaceModel", "replaceModel"]);
  assert.equal(repository.models.find((item) => item.model.id === "user")?.model.parentModelId, "order");
  assert.deepEqual(repository.models.find((item) => item.model.id === "order")?.model.childModelIds, ["user"]);
  assert.equal(repository.relations.length, 1);
});

test("继承创建补偿：更新子模型失败时回滚已插入的关系", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user"), model("order")];
  repository.failOn = (method, id) => (method === "replaceModel" && id === "user" ? new Error("模拟子模型更新失败") : undefined);
  const service = new RelationService(standaloneClient(), repository as never);

  await assert.rejects(service.create({ relationType: "inherit", source: "user", target: "order" }), /模拟子模型更新失败/);

  assert.deepEqual(repository.calls, ["listModels", "insertRelation", "replaceModel", "deleteRelations"]);
  assert.equal(repository.relations.length, 0);
  assert.equal(repository.models.find((item) => item.model.id === "user")?.model.parentModelId, null);
});

test("继承创建补偿：追加父模型失败时回滚子模型与关系", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user"), model("order")];
  repository.failOn = (method, id) => (method === "replaceModel" && id === "order" ? new Error("模拟父模型更新失败") : undefined);
  const service = new RelationService(standaloneClient(), repository as never);

  await assert.rejects(service.create({ relationType: "inherit", source: "user", target: "order" }), /模拟父模型更新失败/);

  assert.deepEqual(repository.calls, ["listModels", "insertRelation", "replaceModel", "replaceModel", "updateModel", "deleteRelations"]);
  assert.equal(repository.relations.length, 0);
  assert.equal(repository.models.find((item) => item.model.id === "user")?.model.parentModelId, null);
});

test("继承创建：成环检测在任何写入/事务之前返回 400 INHERIT_CYCLE", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("root"), model("child", "root")];
  const service = new RelationService(standaloneClient(), repository as never);

  await assert.rejects(
    service.create({ relationType: "inherit", source: "root", target: "child" }),
    (error: { code?: string; status?: number }) => error.code === "INHERIT_CYCLE" && error.status === 400,
  );

  // 只有只读的 listModels，无任何写入
  assert.deepEqual(repository.calls, ["listModels"]);
  assert.equal(repository.relations.length, 0);
});

test("继承创建：非事务不支持错误照常抛出且不降级", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user"), model("order")];
  const service = new RelationService(failingClient(new Error("网络中断")), repository as never);

  await assert.rejects(service.create({ relationType: "inherit", source: "user", target: "order" }), /网络中断/);

  assert.deepEqual(repository.calls, ["listModels"]);
});

test("继承创建：支持事务时走事务且不触发补偿", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user"), model("order")];
  const service = new RelationService(transactionClient(), repository as never);

  const result = await service.create({ relationType: "inherit", source: "user", target: "order" });

  assert.ok(result.id.startsWith("rel_"));
  assert.deepEqual(repository.calls, ["listModels", "insertRelation", "replaceModel", "replaceModel"]);
});

// ---------------- 继承删除补偿 ----------------

test("继承删除补偿：删除关系→清除子模型父引用→移除父模型 childModelIds", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user", "order"), model("order")];
  repository.models.find((item) => item.model.id === "order")!.model.childModelIds = ["user"];
  repository.relations = [{ META_TYPE: "relation", id: "rel_1", relationType: "inherit", source: "user", target: "order" }];
  const service = new RelationService(standaloneClient(), repository as never);

  await service.delete("rel_1");

  assert.deepEqual(repository.calls, ["findRelation", "deleteRelations", "updateModel", "removeChildModel"]);
  assert.equal(repository.relations.length, 0);
  assert.equal(repository.models.find((item) => item.model.id === "user")?.model.parentModelId, null);
  assert.deepEqual(repository.models.find((item) => item.model.id === "order")?.model.childModelIds, []);
});

test("继承删除补偿：清除子模型父引用失败时回滚并恢复关系文档", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user", "order"), model("order")];
  repository.relations = [{ META_TYPE: "relation", id: "rel_1", relationType: "inherit", source: "user", target: "order" }];
  repository.failOn = (method) => (method === "updateModel" ? new Error("模拟清除父引用失败") : undefined);
  const service = new RelationService(standaloneClient(), repository as never);

  await assert.rejects(service.delete("rel_1"), /模拟清除父引用失败/);

  assert.deepEqual(repository.calls, ["findRelation", "deleteRelations", "updateModel", "insertRelation"]);
  assert.equal(repository.relations.length, 1);
});

test("继承删除补偿：普通关系仅删除关系文档", async () => {
  const repository = new RepositoryStub();
  repository.relations = [
    { META_TYPE: "relation", id: "rel_1", relationType: "relation", relationship: { a: { source: "x", target: "y" }, b: { source: "y", target: "x" } } },
  ];
  const service = new RelationService(standaloneClient(), repository as never);

  await service.delete("rel_1");

  assert.deepEqual(repository.calls, ["findRelation", "deleteRelations"]);
  assert.equal(repository.relations.length, 0);
});

test("继承删除补偿：关系不存在时抛出 404", async () => {
  const repository = new RepositoryStub();
  const service = new RelationService(standaloneClient(), repository as never);

  await assert.rejects(service.delete("rel_missing"), (error: { code?: string }) => error.code === "RELATION_NOT_FOUND");

  assert.deepEqual(repository.calls, ["findRelation"]);
});

// ---------------- 模型删除补偿 ----------------

test("模型删除补偿：转移文档→清理关系→恢复继承引用→删除元数据→drop", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user"), model("order")];
  repository.relations = [{ META_TYPE: "relation", id: "rel_1", relationType: "inherit", source: "order", target: "user" }];
  const db = new DbStub();
  db.collections.set("user", [{ _id: "d1", value: 1 }]);
  const service = new DeleteService(standaloneClient(), db as never, repository as never);

  const result = await service.deleteSelection({ modelIds: ["user"], relationIds: [], deleteChildModels: false });

  assert.deepEqual(result, { modelIds: ["user"], relationIds: ["rel_1"] });
  // 转移文档格式 {source, data}
  const moved = db.collections.get("__DETELED_DATAS__") ?? [];
  assert.equal(moved.length, 1);
  assert.equal((moved[0] as { source: string }).source, "user");
  assert.deepEqual((moved[0] as { data: unknown }).data, { _id: "d1", value: 1 });
  // 集合已 drop、模型元数据已删除、未删除模型的父引用被清除
  assert.equal(db.collections.has("user"), false);
  assert.equal(repository.models.find((item) => item.model.id === "user"), undefined);
  assert.equal(repository.models.find((item) => item.model.id === "order")?.model.parentModelId, null);
  assert.deepEqual(repository.calls.filter((call) => call !== "listModels" && call !== "listRelations"), [
    "deleteRelations",
    "updateModel",
    "deleteModels",
  ]);
});

test("模型删除补偿：删除元数据失败时回滚转移、关系与继承引用", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user"), model("order")];
  repository.relations = [{ META_TYPE: "relation", id: "rel_1", relationType: "inherit", source: "order", target: "user" }];
  repository.failOn = (method) => (method === "deleteModels" ? new Error("模拟删除元数据失败") : undefined);
  const db = new DbStub();
  db.collections.set("user", [{ _id: "d1", value: 1 }]);
  const service = new DeleteService(standaloneClient(), db as never, repository as never);

  await assert.rejects(service.deleteSelection({ modelIds: ["user"], relationIds: [], deleteChildModels: false }), /模拟删除元数据失败/);

  // 回滚顺序：撤销继承引用 → 清理并恢复关系 → 撤回转移文档
  assert.deepEqual(repository.calls, [
    "listModels",
    "listRelations",
    "deleteRelations",
    "updateModel",
    "deleteModels",
    "updateModel",
    "deleteRelations",
    "insertRelation",
  ]);
  assert.equal(repository.models.length, 2);
  assert.equal(repository.relations.length, 1);
  assert.equal(db.calls.includes("deleteMany:__DETELED_DATAS__"), true);
  assert.equal((db.collections.get("__DETELED_DATAS__") ?? []).length, 0);
});

test("模型删除补偿：drop 集合失败时回滚含恢复模型元数据", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user")];
  const db = new DbStub();
  db.collections.set("user", [{ _id: "d1", value: 1 }]);
  db.failOn = (method) => (method === "drop:user" ? new Error("模拟 drop 失败") : undefined);
  const service = new DeleteService(standaloneClient(), db as never, repository as never);

  await assert.rejects(service.deleteSelection({ modelIds: ["user"], relationIds: [], deleteChildModels: false }), /模拟 drop 失败/);

  // 回滚含：清残余 + 恢复模型元数据 + 撤回转移文档
  assert.deepEqual(repository.calls, [
    "listModels",
    "listRelations",
    "deleteRelations",
    "deleteModels",
    "deleteModels",
    "insertModel",
    "deleteRelations",
  ]);
  assert.equal(repository.models.length, 1);
  assert.equal(db.calls.includes("deleteMany:__DETELED_DATAS__"), true);
});

test("模型删除补偿：转移文档失败时不回滚且错误照常抛出", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user")];
  const db = new DbStub();
  db.collections.set("user", [{ _id: "d1", value: 1 }]);
  db.failOn = (method) => (method === "insertMany:__DETELED_DATAS__" ? new Error("模拟转移失败") : undefined);
  const service = new DeleteService(standaloneClient(), db as never, repository as never);

  await assert.rejects(service.deleteSelection({ modelIds: ["user"], relationIds: [], deleteChildModels: false }), /模拟转移失败/);

  // stepsDone=0，无任何回滚
  assert.deepEqual(repository.calls, ["listModels", "listRelations"]);
  assert.equal(db.collections.has("__DETELED_DATAS__"), false);
});

test("模型删除：非事务不支持错误照常抛出且不降级", async () => {
  const repository = new RepositoryStub();
  repository.models = [model("user")];
  const db = new DbStub();
  db.collections.set("user", [{ _id: "d1", value: 1 }]);
  const service = new DeleteService(failingClient(new Error("连接超时")), db as never, repository as never);

  await assert.rejects(service.deleteSelection({ modelIds: ["user"], relationIds: [], deleteChildModels: false }), /连接超时/);

  // 只读校验完成，未进入任何写入
  assert.deepEqual(repository.calls, ["listModels", "listRelations"]);
  assert.equal(db.collections.has("__DETELED_DATAS__"), false);
});
