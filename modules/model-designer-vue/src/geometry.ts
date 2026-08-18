import type { ModelPosition } from "./types";

/** 基础网格边长（px） */
export const BASE_GRID = 16;
/** 模型节点半径（世界坐标） */
export const NODE_RADIUS = 44;
/** 箭头与模型边缘间距 */
export const ARROW_GAP = 12;
/** 箭头大小 */
export const ARROW_SIZE = 10;

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 吸附到最近格点 */
export function snapToGrid(value: number, grid = BASE_GRID): number {
  return Math.round(value / grid) * grid;
}

export function midpoint(a: ModelPosition, b: ModelPosition): ModelPosition {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function pointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

export function pointInRect(
  px: number,
  py: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height
  );
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 圆与矩形是否相交 */
export function circleIntersectsRect(
  cx: number,
  cy: number,
  r: number,
  rect: Rect
): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= r * r;
}

/** 线段与矩形是否相交 */
export function lineIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: Rect
): boolean {
  const left = rect.x;
  const top = rect.y;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  const code = (x: number, y: number): number => {
    let c = 0;
    if (x < left) c |= 1;
    else if (x > right) c |= 2;
    if (y < top) c |= 4;
    else if (y > bottom) c |= 8;
    return c;
  };

  let c1 = code(x1, y1);
  let c2 = code(x2, y2);
  while (true) {
    if (!(c1 | c2)) return true;
    if (c1 & c2) return false;
    const out = c1 ? c1 : c2;
    let x = 0;
    let y = 0;
    if (out & 8) {
      x = x1 + ((x2 - x1) * (bottom - y1)) / (y2 - y1);
      y = bottom;
    } else if (out & 4) {
      x = x1 + ((x2 - x1) * (top - y1)) / (y2 - y1);
      y = top;
    } else if (out & 2) {
      y = y1 + ((y2 - y1) * (right - x1)) / (x2 - x1);
      x = right;
    } else if (out & 1) {
      y = y1 + ((y2 - y1) * (left - x1)) / (x2 - x1);
      x = left;
    }
    if (out === c1) {
      x1 = x;
      y1 = y;
      c1 = code(x, y);
    } else {
      x2 = x;
      y2 = y;
      c2 = code(x, y);
    }
  }
}

export interface CircleEdgePoint extends ModelPosition {
  angle: number;
}

/** 从 from 指向 to 的方向上，距 from 圆心 gap 的圆周点（用于箭头截断）。 */
export function circleEdgeWithGap(
  fromX: number,
  fromY: number,
  r: number,
  toX: number,
  toY: number,
  gap: number
): CircleEdgePoint {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy) || 1;
  const distance = r + gap;
  const angle = Math.atan2(dy, dx);
  return {
    x: fromX + (dx / len) * distance,
    y: fromY + (dy / len) * distance,
    angle,
  };
}

/** 点到线段的最短距离 */
export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** 选中模型的包围盒（虚线框）。 */
export function selectionBox(
  cx: number,
  cy: number,
  r: number,
  padding = 8
): Rect {
  return {
    x: cx - r - padding,
    y: cy - r - padding,
    width: r * 2 + padding * 2,
    height: r * 2 + padding * 2,
  };
}

/** Catmull-Rom 插值曲线采样。 */
export function catmullRom(
  points: ModelPosition[],
  segments = 32
): ModelPosition[] {
  if (points.length < 3) return points;
  const p = [points[0], points[0], ...points, points[points.length - 1]];
  const out: ModelPosition[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      const p0 = p[i - 1];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[i + 2];
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return out;
}
