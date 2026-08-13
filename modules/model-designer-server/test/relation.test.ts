import assert from "node:assert/strict";
import test from "node:test";
import { RelationService } from "../src/services/relation.service.js";
import type { RelationMeta } from "../src/types.js";

const current: RelationMeta = {
  META_TYPE: "relation",
  id: "rel_1",
  relationType: "relation",
  relationship: {
    user: { source: "user", target: "order" },
    order: { source: "order", target: "user" },
  },
  name: "旧关系",
  kind: "one-to-one",
};

class RelationRepositoryStub {
  saved?: RelationMeta;

  findRelation(): Promise<RelationMeta> {
    return Promise.resolve(current);
  }

  listModels() {
    return Promise.resolve([
      { model: { id: "user" } },
      { model: { id: "order" } },
    ]);
  }

  replaceRelation(_id: string, relation: RelationMeta): Promise<boolean> {
    this.saved = relation;
    return Promise.resolve(true);
  }
}

test("关系 PATCH 持久化非位置属性与位置", async () => {
  const repository = new RelationRepositoryStub();
  const service = new RelationService({} as never, repository as never);

  const result = await service.update("rel_1", {
    name: "新关系",
    kind: "many-to-many",
    locked: false,
    position: { x: 20, y: 40 },
  });

  assert.equal(result.name, "新关系");
  assert.equal(result.kind, "many-to-many");
  assert.equal(result.locked, false);
  assert.deepEqual(result.position, { x: 20, y: 40 });
  assert.deepEqual(repository.saved, result);
});

test("关系 PATCH 拒绝未知关系类型", async () => {
  const service = new RelationService({} as never, new RelationRepositoryStub() as never);
  await assert.rejects(
    service.update("rel_1", { kind: "unknown" } as never),
    (error: { code?: string }) => error.code === "INVALID_PAYLOAD",
  );
});
