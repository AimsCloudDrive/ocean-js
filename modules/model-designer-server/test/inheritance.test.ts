import assert from "node:assert/strict";
import test from "node:test";
import { createsInheritanceCycle } from "../src/services/inheritance.js";
import type { ModelMeta } from "../src/types.js";

function model(id: string, parentModelId: string | null): ModelMeta {
  return { META_TYPE: "model", model: { id, name: id, parentModelId, childModelIds: [] }, fields: [], position: { x: 0, y: 0 } };
}

test("拒绝模型继承自身", () => assert.equal(createsInheritanceCycle([model("a", null)], "a", "a"), true));
test("拒绝反向连接已有继承链形成环", () => {
  const models = [model("root", null), model("child", "root"), model("leaf", "child")];
  assert.equal(createsInheritanceCycle(models, "root", "leaf"), true);
});
test("允许连接到无环父模型", () => {
  const models = [model("root", null), model("child", null)];
  assert.equal(createsInheritanceCycle(models, "child", "root"), false);
});
