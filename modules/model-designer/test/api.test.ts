import assert from "node:assert/strict";
import test from "node:test";
import { createHttpModelDesignerApi } from "../src/api.ts";

interface CapturedRequest {
  url: string;
  method: string;
  body?: unknown;
}

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data, message: "ok", requestId: "req_test" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function installFetch(responses: unknown[]): CapturedRequest[] {
  const captured: CapturedRequest[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    captured.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return envelope(responses.shift());
  }) as typeof fetch;
  return captured;
}

test("解包 bootstrap 并转换模型、普通关系和继承关系", async () => {
  const captured = installFetch([{
    canvas: { META_TYPE: "base", center: { x: 10, y: 20 }, scale: 1.25, locked: true },
    models: [{
      META_TYPE: "model",
      model: { id: "user", name: "用户", description: "用户模型", parentModelId: null, childModelIds: [] },
      fields: [{ id: "name", name: "名称", type: "string" }],
      position: { x: 40, y: 60 },
    }],
    relations: [
      {
        META_TYPE: "relation",
        id: "rel_1",
        relationType: "relation",
        relationship: {
          user: { source: "user", target: "order" },
          order: { source: "order", target: "user" },
        },
        name: "下单",
        kind: "one-to-many",
      },
      { META_TYPE: "relation", id: "rel_2", relationType: "inherit", source: "admin", target: "user" },
    ],
  }]);

  const api = createHttpModelDesignerApi({ baseUrl: "https://example.test/api/model-designer" });
  const result = await api.bootstrap();

  assert.deepEqual(result.canvas, { center: { x: 10, y: 20 }, scale: 1.25, locked: true });
  assert.deepEqual(result.models[0], {
    id: "user",
    name: "用户",
    description: "用户模型",
    parentModelId: null,
    childModelIds: [],
    fields: [{ id: "name", name: "名称", type: "string" }],
    x: 40,
    y: 60,
  });
  assert.deepEqual(result.relations.map(({ id, sourceId, targetId, kind }) => ({ id, sourceId, targetId, kind })), [
    { id: "rel_1", sourceId: "user", targetId: "order", kind: "one-to-many" },
    { id: "rel_2", sourceId: "admin", targetId: "user", kind: "one-to-one" },
  ]);
  assert.deepEqual(captured[0], {
    url: "https://example.test/api/model-designer/bootstrap",
    method: "GET",
    body: undefined,
  });
});

test("位置通过模型 PATCH，画布锁定通过完整 canvas PUT", async () => {
  const captured = installFetch([
    { canvas: { META_TYPE: "base", center: { x: 5, y: 6 }, scale: 1 }, models: [], relations: [] },
    { META_TYPE: "model", model: { id: "user", name: "用户" }, fields: [], position: { x: 80, y: 100 } },
    { META_TYPE: "base", center: { x: 5, y: 6 }, scale: 1, locked: true },
  ]);
  const api = createHttpModelDesignerApi({ baseUrl: "https://example.test/api/model-designer" });

  await api.bootstrap();
  await api.updateModelPosition("user", { x: 80, y: 100 });
  await api.setLocked(true);

  assert.deepEqual(captured.slice(1), [
    {
      url: "https://example.test/api/model-designer/models/user",
      method: "PATCH",
      body: { position: { x: 80, y: 100 } },
    },
    {
      url: "https://example.test/api/model-designer/canvas",
      method: "PUT",
      body: { center: { x: 5, y: 6 }, scale: 1, locked: true },
    },
  ]);
});

test("模型属性和关系属性转换为服务端 PATCH 结构", async () => {
  const captured = installFetch([
    {
      META_TYPE: "model",
      model: { id: "user", name: "新名称", locked: false },
      fields: [],
      position: { x: 0, y: 0 },
    },
    {
      META_TYPE: "relation",
      id: "rel_1",
      relationType: "relation",
      relationship: {
        user: { source: "user", target: "order" },
        order: { source: "order", target: "user" },
      },
      name: "新关系",
      kind: "many-to-many",
    },
  ]);
  const api = createHttpModelDesignerApi({ baseUrl: "https://example.test/api/model-designer" });

  await api.updateModel("user", { name: "新名称", locked: false });
  await api.updateRelation("rel_1", { name: "新关系", kind: "many-to-many" });

  assert.deepEqual(captured.map(({ method, body }) => ({ method, body })), [
    { method: "PATCH", body: { model: { name: "新名称", locked: false } } },
    { method: "PATCH", body: { name: "新关系", kind: "many-to-many" } },
  ]);
});
