import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parseArgs } from "../src/config/parseArgs.js";

// 使用不存在的 .env 路径隔离 public/.env 文件内容对测试的影响
const NO_ENV = ".env-not-exists";

test("启动参数默认端口为 9090", () => {
  const config = parseArgs(["--db", "designer", "--mongo", "mongodb://localhost", "--user", "root", "--password", "secret"], NO_ENV);
  assert.equal(config.port, 9090);
});

test("缺少任意必填参数时拒绝启动", () => {
  assert.throws(() => parseArgs(["--db", "designer", "--mongo", "mongodb://localhost", "--user", "root"], NO_ENV), /--password 必填/);
});

test("非法端口时拒绝启动", () => {
  assert.throws(() => parseArgs(["--db", "designer", "--mongo", "mongodb://localhost", "--user", "root", "--password", "secret", "--port", "70000"], NO_ENV), /1 到 65535/);
});

test("命令行参数优先于环境文件", () => {
  const envFile = ".env-test-priority";
  fs.writeFileSync(envFile, "db=env-db\nmongo=mongodb://env\nuser=env-user\npassword=env-pass\nport=8080");
  try {
    const config = parseArgs(["--db", "cli-db", "--port", "9091"], envFile);
    assert.equal(config.db, "cli-db");
    assert.equal(config.port, 9091);
    assert.equal(config.mongo, "mongodb://env");
  } finally {
    fs.rmSync(envFile);
  }
});

test("无命令行参数时读取环境文件", () => {
  const envFile = ".env-test-read";
  fs.writeFileSync(envFile, "db=env-db\nmongo=mongodb://env\nuser=env-user\npassword=env-pass\nport=8080");
  try {
    const config = parseArgs([], envFile);
    assert.equal(config.db, "env-db");
    assert.equal(config.port, 8080);
  } finally {
    fs.rmSync(envFile);
  }
});
