import type { ModelPosition } from "./types";

// ── 常量 ──────────────────────────────────────────

export const BASE_GRID = 16;
export const NODE_RADIUS = 44;
export const ARROW_GAP = 12;
export const ARROW_SIZE = 8;

// ── 基础工具 ──────────────────────────────────────

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── 矩形与相交 ────────────────────────────────────

export interface Rectangle extends ModelPosition {
  width: number;
  height: number;
}

export function intersects(left: Rectangle, right: Rectangle): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function pointInRect(px: number, py: number, rect: Rectangle): boolean {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

/** 线段与矩形是否相交（Liang-Barsky 算法）。 */
export function lineIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  rect: Rectangle
): boolean {
  const { x, y, width, height } = rect;
  const minX = x, maxX = x + width, minY = y, maxY = y + height;
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - minX, maxX - x1, y1 - minY, maxY - y1];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

// ── 圆形碰撞 ──────────────────────────────────────

export function pointInCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

export function circleIntersectsRect(cx: number, cy: number, r: number, rect: Rectangle): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - closestX, dy = cy - closestY;
  return dx * dx + dy * dy <= r * r;
}

// ── 箭头路径 ──────────────────────────────────────

/**
 * 计算从圆心 (cx,cy) 沿方向 (toward) 到圆边缘再加 gap 的截断点。
 * 用于箭头与模型保持间距。
 */
export function circleEdgeWithGap(
  cx: number, cy: number, r: number,
  towardX: number, towardY: number, gap: number
): { x: number; y: number; angle: number } {
  const dx = towardX - cx, dy = towardY - cy;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  const edgeX = cx + ux * (r + gap);
  const edgeY = cy + uy * (r + gap);
  return { x: edgeX, y: edgeY, angle: Math.atan2(uy, ux) };
}

/**
 * 生成从源圆到目标圆的直线箭头路径（带间距截断）。
 */
export function straightArrowPath(
  sx: number, sy: number, sr: number,
  tx: number, ty: number, tr: number,
  gap: number = ARROW_GAP
): { path: string; endX: number; endY: number; angle: number } {
  const start = circleEdgeWithGap(sx, sy, sr, tx, ty, gap);
  const end = circleEdgeWithGap(tx, ty, tr, sx, sy, gap);
  const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  return { path, endX: end.x, endY: end.y, angle: end.angle + Math.PI };
}

/**
 * 生成三点贝塞尔曲线路径（源 → 信息框 → 目标）。
 * 返回两段路径和各自的箭头终点。
 */
export function curvedArrowPaths(
  sx: number, sy: number, sr: number,
  mx: number, my: number,
  tx: number, ty: number, tr: number,
  gap: number = ARROW_GAP
): { forward: string; reverse: string; fwdEnd: { x: number; y: number; angle: number }; revEnd: { x: number; y: number; angle: number } } {
  // 源 → 信息框
  const fwdStart = circleEdgeWithGap(sx, sy, sr, mx, my, gap);
  const fwdEnd = circleEdgeWithGap(mx, my, 0, sx, sy, gap);
  // 信息框 → 目标
  const revStart = circleEdgeWithGap(mx, my, 0, tx, ty, gap);
  const revEnd = circleEdgeWithGap(tx, ty, tr, mx, my, gap);

  const ctrl1x = (fwdStart.x + mx) / 2;
  const ctrl1y = (fwdStart.y + my) / 2;
  const ctrl2x = (mx + revEnd.x) / 2;
  const ctrl2y = (my + revEnd.y) / 2;

  const forward = `M ${fwdStart.x} ${fwdStart.y} Q ${ctrl1x} ${ctrl1y} ${fwdEnd.x} ${fwdEnd.y}`;
  const reverse = `M ${revStart.x} ${revStart.y} Q ${ctrl2x} ${ctrl2y} ${revEnd.x} ${revEnd.y}`;

  return {
    forward,
    reverse,
    fwdEnd: { x: fwdEnd.x, y: fwdEnd.y, angle: Math.atan2(fwdEnd.y - ctrl1y, fwdEnd.x - ctrl1x) },
    revEnd: { x: revEnd.x, y: revEnd.y, angle: Math.atan2(revEnd.y - ctrl2y, revEnd.x - ctrl2x) },
  };
}

/**
 * 计算两点之间的中点（用于信息框默认位置）。
 */
export function midpoint(a: ModelPosition, b: ModelPosition): ModelPosition {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * 绘制箭头三角形 SVG path。
 */
export function arrowHead(x: number, y: number, angle: number, size: number = ARROW_SIZE): string {
  const x1 = x - size * Math.cos(angle - Math.PI / 6);
  const y1 = y - size * Math.sin(angle - Math.PI / 6);
  const x2 = x - size * Math.cos(angle + Math.PI / 6);
  const y2 = y - size * Math.sin(angle + Math.PI / 6);
  return `M ${x} ${y} L ${x1} ${y1} M ${x} ${y} L ${x2} ${y2}`;
}

// ── 网格常量 ──────────────────────────────────────

export const GRID_LEVELS = {
  base: BASE_GRID,
  secondary: BASE_GRID * 5,
  tertiary: BASE_GRID * 25,
} as const;

// ── 选中包围盒 ────────────────────────────────────

/**
 * 计算圆形节点的选中包围盒（含 padding）。
 */
export function selectionBox(cx: number, cy: number, r: number, padding: number = 8): Rectangle {
  return {
    x: cx - r - padding,
    y: cy - r - padding,
    width: (r + padding) * 2,
    height: (r + padding) * 2,
  };
}

// ── 点到线段距离 ──────────────────────────────────

export function distToSegment(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number
): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * 检测点是否在贝塞尔曲线附近（近似：采样多个点，取到线段的最小距离）。
 */
export function pointNearBezier(
  px: number, py: number,
  sx: number, sy: number, cpx: number, cpy: number, ex: number, ey: number,
  threshold: number = 8
): boolean {
  const steps = 20;
  let prevX = sx, prevY = sy;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * sx + 2 * u * t * cpx + t * t * ex;
    const y = u * u * sy + 2 * u * t * cpy + t * t * ey;
    if (distToSegment(px, py, prevX, prevY, x, y) <= threshold) return true;
    prevX = x;
    prevY = y;
  }
  return false;
}
