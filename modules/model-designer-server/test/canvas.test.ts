import assert from "node:assert/strict";
import test from "node:test";
import { CanvasService } from "../src/services/canvas.service.js";
import type { CanvasMeta } from "../src/types.js";

class CanvasRepositoryStub {
  saved?: CanvasMeta;

  getCanvas(): Promise<CanvasMeta> {
    return Promise.resolve({ META_TYPE: "base", center: { x: 0, y: 0 }, scale: 1 });
  }

  saveCanvas(canvas: CanvasMeta): Promise<CanvasMeta> {
    this.saved = canvas;
    return Promise.resolve(canvas);
  }
}

test("画布保存接受并持久化锁定状态", async () => {
  const repository = new CanvasRepositoryStub();
  const service = new CanvasService(repository as never);

  const result = await service.save({ center: { x: 10, y: 20 }, scale: 1.5, locked: true });

  assert.deepEqual(result, {
    META_TYPE: "base",
    center: { x: 10, y: 20 },
    scale: 1.5,
    locked: true,
  });
  assert.deepEqual(repository.saved, result);
});

test("画布保存拒绝非布尔锁定状态", async () => {
  const service = new CanvasService(new CanvasRepositoryStub() as never);
  await assert.rejects(
    service.save({ center: { x: 0, y: 0 }, scale: 1, locked: "true" }),
    (error: { code?: string }) => error.code === "INVALID_PAYLOAD",
  );
});
