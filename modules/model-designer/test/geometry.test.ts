import assert from "node:assert/strict";
import test from "node:test";
import { createRelationPath, intersects, snapToGrid } from "../src/geometry.ts";

test("位置吸附到网格且不允许负坐标", () => {
  assert.equal(snapToGrid(29, 20), 20);
  assert.equal(snapToGrid(31, 20), 40);
  assert.equal(snapToGrid(-20, 20), 0);
});

test("框选矩形命中相交节点，不命中仅接触边界的节点", () => {
  const selection = { x: 50, y: 50, width: 100, height: 100 };
  assert.equal(
    intersects({ x: 20, y: 20, width: 50, height: 50 }, selection),
    true
  );
  assert.equal(
    intersects({ x: 150, y: 50, width: 50, height: 50 }, selection),
    false
  );
});

test("关系路径连接两个节点中心", () => {
  assert.equal(
    createRelationPath(
      { x: 0, y: 0, width: 100, height: 40 },
      { x: 200, y: 100, width: 100, height: 40 }
    ),
    "M 50 20 C 140 20, 160 120, 250 120"
  );
});
