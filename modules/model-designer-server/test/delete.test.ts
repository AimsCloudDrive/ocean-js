import assert from "node:assert/strict";
import test from "node:test";
import { resolveDeleteIds } from "../src/services/delete.service.js";
import type { ModelMeta } from "../src/types.js";

function model(id: string, children: string[]): ModelMeta {
  return { META_TYPE: "model", model: { id, name: id, parentModelId: null, childModelIds: children }, fields: [], position: { x: 0, y: 0 } };
}

const models = [model("root", ["child"]), model("child", ["leaf"]), model("leaf", [])];

test("未声明删除子树时拒绝删除有子模型的模型", () => {
  assert.throws(() => resolveDeleteIds(models, ["root"], false), (error: { code?: string }) => error.code === "MODEL_HAS_CHILDREN");
});

test("声明删除子树时递归收集且不重复", () => {
  assert.deepEqual(new Set(resolveDeleteIds(models, ["root", "child"], true)), new Set(["root", "child", "leaf"]));
});
