import assert from "node:assert/strict";
import test from "node:test";
import { route, success } from "../src/utils/response.js";

function responseStub() {
  return {
    headersSent: false,
    locals: {} as Record<string, unknown>,
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      this.headersSent = true;
      return this;
    },
  };
}

test("成功响应复用当前请求的 requestId", async () => {
  const response = responseStub();
  const handler = route(async (_request, currentResponse) => {
    success(currentResponse, { value: 1 });
  });

  await handler({} as never, response as never, () => undefined);

  const body = response.body as { success: boolean; data: unknown; requestId: string };
  assert.equal(body.success, true);
  assert.deepEqual(body.data, { value: 1 });
  assert.equal(body.requestId, response.locals.requestId);
});

test("未显式返回数据时仍使用统一成功包装", async () => {
  const response = responseStub();
  await route(async () => undefined)({} as never, response as never, () => undefined);

  assert.deepEqual(response.body, {
    success: true,
    data: null,
    message: "ok",
    requestId: response.locals.requestId,
  });
});
