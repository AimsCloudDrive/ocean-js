import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs } from "../src/config/parseArgs.js";

test("启动参数默认端口为 9091", () => {
  const config = parseArgs([]);
  assert.equal(config.port, 9091);
});

test("命令行可指定服务端口", () => {
  const config = parseArgs(["--port", "8080"]);
  assert.equal(config.port, 8080);
});

test("非法服务端口时拒绝启动", () => {
  assert.throws(() => parseArgs(["--port", "70000"]), /--port 必须是 1 到 65535/);
});

test("非 --key value 格式时拒绝启动", () => {
  assert.throws(() => parseArgs(["--port"]), /启动参数格式错误：--port/);
});
