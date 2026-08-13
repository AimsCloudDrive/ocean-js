import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs } from "../src/config/parseArgs.js";

test("启动参数默认端口为 9090", () => {
  const config = parseArgs(["--db", "designer", "--mongo", "mongodb://localhost", "--user", "root", "--password", "secret"]);
  assert.equal(config.port, 9090);
});

test("缺少任意必填参数时拒绝启动", () => {
  assert.throws(() => parseArgs(["--db", "designer", "--mongo", "mongodb://localhost", "--user", "root"]), /--password 必填/);
});

test("非法端口时拒绝启动", () => {
  assert.throws(() => parseArgs(["--db", "designer", "--mongo", "mongodb://localhost", "--user", "root", "--password", "secret", "--port", "70000"]), /1 到 65535/);
});
