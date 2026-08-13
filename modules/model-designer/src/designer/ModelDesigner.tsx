import { Component, ComponentProps, component, option } from "@msom/component";
import { createSingleRef, mountWith, SingleRef } from "@msom/dom";
import { observer } from "@msom/reaction";
import { createHttpModelDesignerApi } from "../api";
import {
  ARROW_GAP,
  ARROW_SIZE,
  BASE_GRID,
  NODE_RADIUS,
  circleEdgeWithGap,
  circleIntersectsRect,
  clamp,
  lineIntersectsRect,
  midpoint,
  pointInCircle,
  pointInRect,
  selectionBox,
  snapToGrid,
} from "../geometry";
import type {
  ModelDesignerApi,
  ModelField,
  ModelNode,
  ModelPatch,
  ModelPosition,
  ModelRelation,
  RelationDirection,
} from "../types";
import { ensureModelDesignerStyle } from "./style";

const MODEL_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#f59e0b",
  "#8b5cf6", "#06b6d4", "#ec4899", "#6366f1",
];

const FIELD_TYPES = ["String", "Number", "Boolean", "Date", "ObjectId", "Array", "Object"];

const DRAG_THRESHOLD = 4;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

type CreateState =
  | { type: "none" }
  | { type: "model" }
  | { type: "relation"; step: "source" | "target"; sourceId?: string }
  | { type: "inherit"; step: "child" | "parent"; childId?: string };

type DrawerState =
  | { type: "closed" }
  | { type: "model"; id: string; modelId: string; name: string; description: string; color: string }
  | { type: "relation"; id: string; fwdName: string; fwdMapping: string; revName: string; revMapping: string };

interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ModelDesignerProps = ComponentProps & {
  title?: string;
  api?: ModelDesignerApi;
  bootstrap?: boolean;
};

@component("ModelDesigner")
class ModelDesigner extends Component<ModelDesignerProps> {
  @option({ type: "string" })
  declare title?: string;

  @option({ type: "unknown" })
  declare api?: ModelDesignerApi;

  @option({ type: "boolean" })
  declare bootstrap?: boolean;

  @observer()
  declare models: ModelNode[];

  @observer()
  declare relations: ModelRelation[];

  @observer()
  declare selectedIds: string[];

  @observer()
  declare drawer: DrawerState;

  @observer()
  declare loading: boolean;

  @observer()
  declare saving: boolean;

  @observer()
  declare readOnly: boolean;

  @observer()
  declare error: string | undefined;

  @observer()
  declare fieldVersion: number;

  @observer()
  declare createState: CreateState;

  declare viewport: Viewport;

  declare canvasRef: SingleRef<HTMLCanvasElement>;
  declare wrapperRef: SingleRef<HTMLDivElement>;

  private rafId: number | undefined;
  private dragCleanup?: () => void;
  private resizeObserver?: ResizeObserver;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private canvasDpr = 1;
  private canvasReady = false;
  private canvasSetup = false;
  private dirty = true;
  private expandedFields: Set<string> = new Set();
  private pendingModelPositions: Map<string, ModelPosition> = new Map();

  init(): void {
    super.init();
    this.models = [];
    this.relations = [];
    this.selectedIds = [];
    this.drawer = { type: "closed" };
    this.loading = true;
    this.saving = false;
    this.readOnly = false;
    this.error = undefined;
    this.fieldVersion = 0;
    this.createState = { type: "none" };
    this.viewport = { offsetX: 0, offsetY: 0, scale: 1 };
    this.canvasRef = createSingleRef();
    this.wrapperRef = createSingleRef();
    this.onclean(() => {
      if (this.rafId !== undefined) cancelAnimationFrame(this.rafId);
      this.dragCleanup?.();
      this.resizeObserver?.disconnect();
    });
  }

  mounted(): void {
    super.mounted();
    ensureModelDesignerStyle();
    this.canvasReady = true;
    this.setupCanvas();
    this.startRenderLoop();
    if (this.bootstrap === false) {
      this.loading = false;
      return;
    }
    void this.load();
  }

  private get service(): ModelDesignerApi {
    return this.api || createHttpModelDesignerApi();
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  // ── 数据加载 ─────────────────────────────────────

  async load(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      const data = await this.service.bootstrap();
      this.models = data.models;
      this.relations = data.relations;
      this.readOnly = Boolean(data.canvas.locked);
    } catch (error) {
      this.error = this.getErrorMessage(error, "加载模型设计器失败");
    } finally {
      this.loading = false;
      this.invalidate();
    }
  }

  // ── Canvas 设置 ─────────────────────────────────

  private getCanvasElements(): { canvas: HTMLCanvasElement; wrapper: HTMLDivElement } | undefined {
    let canvas = this.canvasRef.current;
    let wrapper = this.wrapperRef.current;
    if (!canvas || !wrapper) {
      const root = document.querySelector(".model-designer");
      if (root) {
        if (!canvas) canvas = (root.querySelector("canvas") as HTMLCanvasElement) ?? undefined;
        if (!wrapper) wrapper = (root.querySelector(".model-designer__canvas-wrapper") as HTMLDivElement) ?? undefined;
      }
    }
    if (!canvas || !wrapper) return undefined;
    return { canvas, wrapper };
  }

  private setupCanvas(): void {
    if (this.canvasSetup) return;
    const els = this.getCanvasElements();
    if (!els) return;
    const { canvas, wrapper } = els;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (w === 0 || h === 0) return;
    this.canvasSetup = true;
    this.canvasRef.current = canvas;
    this.wrapperRef.current = wrapper;
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });
    this.resizeObserver.observe(wrapper);
    this.resizeCanvas();
  }

  private applyCanvasSize(): void {
    const els = this.getCanvasElements();
    if (!els) return;
    const { canvas, wrapper } = els;
    const dpr = window.devicePixelRatio || 1;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.canvasDpr = dpr;
  }

  private resizeCanvas(): void {
    this.applyCanvasSize();
    this.invalidate();
  }

  private startRenderLoop(): void {
    if (this.rafId !== undefined) return;
    const loop = () => {
      // 每帧检查：dirty 标志或画布被重建（300x150 默认值）时重绘
      const els = this.getCanvasElements();
      const canvasReset = els && (!els.canvas.style.width || els.canvas.width === 300);
      if (this.dirty || canvasReset) {
        this.dirty = false;
        this.renderCanvas();
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private invalidate(): void {
    this.dirty = true;
  }

  /** 画布渲染时使用的选中列表：框选中使用 pendingSelectedIds，否则使用 selectedIds */
  private get effectiveSelectedIds(): string[] {
    return this.selectionRect ? this.pendingSelectedIds : this.selectedIds;
  }

  // ── 坐标转换 ─────────────────────────────────────

  private screenToWorld(sx: number, sy: number): ModelPosition {
    const { offsetX, offsetY, scale } = this.viewport;
    return { x: (sx - offsetX) / scale, y: (sy - offsetY) / scale };
  }

  private worldToScreen(wx: number, wy: number): ModelPosition {
    const { offsetX, offsetY, scale } = this.viewport;
    return { x: wx * scale + offsetX, y: wy * scale + offsetY };
  }

  private getCanvasPoint(event: { clientX: number; clientY: number }): ModelPosition {
    const els = this.getCanvasElements();
    if (!els) return { x: 0, y: 0 };
    const rect = els.canvas.getBoundingClientRect();
    return this.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
  }

  // ── Canvas 渲染 ──────────────────────────────────

  private renderCanvas(): void {
    if (!this.canvasSetup) {
      this.setupCanvas();
    }
    if (!this.canvasReady) return;
    const els = this.getCanvasElements();
    if (!els) return;
    // 检测画布是否被重建（尺寸重置为默认值 300x150）
    if (!els.canvas.style.width || els.canvas.width === 300) {
      this.applyCanvasSize();
    }
    const ctx = els.canvas.getContext("2d");
    if (!ctx) return;
    const dpr = this.canvasDpr;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    this.drawGrid(ctx, w, h);
    this.drawRelations(ctx);
    this.drawModels(ctx);

    if (this.selectionRect) {
      this.drawSelectionRect(ctx);
    }

    if (this.createState.type !== "none") {
      this.drawCreationPreview(ctx);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const { offsetX, offsetY, scale } = this.viewport;
    const worldLeft = -offsetX / scale;
    const worldTop = -offsetY / scale;
    const worldRight = (w - offsetX) / scale;
    const worldBottom = (h - offsetY) / scale;

    // Level 1: base grid (16px)
    if (BASE_GRID * scale >= 6) {
      ctx.strokeStyle = "#e8ecf3";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const sx0 = Math.floor(worldLeft / BASE_GRID) * BASE_GRID;
      for (let x = sx0; x <= worldRight; x += BASE_GRID) {
        const px = x * scale + offsetX;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
      }
      const sy0 = Math.floor(worldTop / BASE_GRID) * BASE_GRID;
      for (let y = sy0; y <= worldBottom; y += BASE_GRID) {
        const py = y * scale + offsetY;
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
      }
      ctx.stroke();
    }

    // Level 2: secondary grid (80px)
    const sec = BASE_GRID * 5;
    ctx.strokeStyle = "#c9d4e3";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const sx1 = Math.floor(worldLeft / sec) * sec;
    for (let x = sx1; x <= worldRight; x += sec) {
      const px = x * scale + offsetX;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    const sy1 = Math.floor(worldTop / sec) * sec;
    for (let y = sy1; y <= worldBottom; y += sec) {
      const py = y * scale + offsetY;
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }
    ctx.stroke();

    // Level 3: tertiary grid (400px)
    const ter = BASE_GRID * 25;
    ctx.strokeStyle = "#a8b5c9";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const sx2 = Math.floor(worldLeft / ter) * ter;
    for (let x = sx2; x <= worldRight; x += ter) {
      const px = x * scale + offsetX;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    const sy2 = Math.floor(worldTop / ter) * ter;
    for (let y = sy2; y <= worldBottom; y += ter) {
      const py = y * scale + offsetY;
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }
    ctx.stroke();
  }

  private drawModels(ctx: CanvasRenderingContext2D): void {
    const r = NODE_RADIUS * this.viewport.scale;
    for (const model of this.models) {
      const sPos = this.worldToScreen(model.x, model.y);
      const color = model.color || "#2563eb";
      const isSelected = this.effectiveSelectedIds.includes(model.id);

      // Selection box (dashed)
      if (isSelected) {
        const box = selectionBox(sPos.x, sPos.y, r, 8);
        ctx.strokeStyle = "#94a3b8";
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.setLineDash([]);

        // Lock icon at top-left
        this.drawLockIcon(ctx, box.x, box.y, Boolean(model.locked));
      }

      // Circle fill
      ctx.beginPath();
      ctx.arc(sPos.x, sPos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(color, 0.12);
      ctx.fill();

      // Circle border
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Name
      ctx.fillStyle = color;
      const fontSize = Math.max(10, 14 * this.viewport.scale);
      ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(model.name, sPos.x, sPos.y);
    }
  }

  private drawRelations(ctx: CanvasRenderingContext2D): void {
    const r = NODE_RADIUS * this.viewport.scale;
    const gap = ARROW_GAP * this.viewport.scale;

    for (const relation of this.relations) {
      const source = this.models.find((m) => m.id === relation.sourceId);
      const target = this.models.find((m) => m.id === relation.targetId);
      if (!source || !target) continue;

      const sPos = this.worldToScreen(source.x, source.y);
      const tPos = this.worldToScreen(target.x, target.y);

      if (relation.relationType === "inherit") {
        // Dashed gray arrow: child → parent
        const start = circleEdgeWithGap(sPos.x, sPos.y, r, tPos.x, tPos.y, gap);
        const end = circleEdgeWithGap(tPos.x, tPos.y, r, sPos.x, sPos.y, gap);

        ctx.save();
        ctx.strokeStyle = "#9ca3af";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.restore();

        this.drawArrowHead(ctx, end.x, end.y, start.angle + Math.PI);
        continue;
      }

      // Normal relation
      const hasCustomPos = !!relation.position;
      const infoPos = hasCustomPos
        ? this.worldToScreen(relation.position!.x, relation.position!.y)
        : midpoint(sPos, tPos);
      const isCurved = hasCustomPos || relation.locked;

      if (isCurved) {
        // Curved: two quadratic bezier from info box to each model
        const fwdStart = circleEdgeWithGap(infoPos.x, infoPos.y, 0, sPos.x, sPos.y, gap);
        const fwdEnd = circleEdgeWithGap(sPos.x, sPos.y, r, infoPos.x, infoPos.y, gap);
        const revStart = circleEdgeWithGap(infoPos.x, infoPos.y, 0, tPos.x, tPos.y, gap);
        const revEnd = circleEdgeWithGap(tPos.x, tPos.y, r, infoPos.x, infoPos.y, gap);

        const c1x = (fwdStart.x + fwdEnd.x) / 2;
        const c1y = (fwdStart.y + fwdEnd.y) / 2;
        const c2x = (revStart.x + revEnd.x) / 2;
        const c2y = (revStart.y + revEnd.y) / 2;

        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fwdStart.x, fwdStart.y);
        ctx.quadraticCurveTo(c1x, c1y, fwdEnd.x, fwdEnd.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(revStart.x, revStart.y);
        ctx.quadraticCurveTo(c2x, c2y, revEnd.x, revEnd.y);
        ctx.stroke();

        this.drawArrowHead(ctx, fwdEnd.x, fwdEnd.y, Math.atan2(fwdEnd.y - c1y, fwdEnd.x - c1x));
        this.drawArrowHead(ctx, revEnd.x, revEnd.y, Math.atan2(revEnd.y - c2y, revEnd.x - c2x));
      } else {
        // Straight: two lines from info box to each model
        const end1 = circleEdgeWithGap(sPos.x, sPos.y, r, infoPos.x, infoPos.y, gap);
        const end2 = circleEdgeWithGap(tPos.x, tPos.y, r, infoPos.x, infoPos.y, gap);

        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(infoPos.x, infoPos.y);
        ctx.lineTo(end1.x, end1.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(infoPos.x, infoPos.y);
        ctx.lineTo(end2.x, end2.y);
        ctx.stroke();

        this.drawArrowHead(ctx, end1.x, end1.y, end1.angle + Math.PI);
        this.drawArrowHead(ctx, end2.x, end2.y, end2.angle + Math.PI);
      }

      // Info box
      this.drawInfoBox(ctx, infoPos.x, infoPos.y, relation);
    }
  }

  private drawInfoBox(ctx: CanvasRenderingContext2D, x: number, y: number, relation: ModelRelation): void {
    const fwd = relation.forward;
    const rev = relation.reverse;
    const fwdText = fwd ? `${fwd.name}·${fwd.mappingType}` : "";
    const revText = rev ? `${rev.name}·${rev.mappingType}` : "";

    ctx.font = "11px -apple-system, sans-serif";
    const maxLen = Math.max(fwdText.length, revText.length, 4);
    const textW = ctx.measureText(fwdText.length > revText.length ? fwdText : revText).width;
    const boxW = Math.max(textW + 20, 50);
    const boxH = 34;
    const boxX = x - boxW / 2;
    const boxY = y - boxH / 2;

    // Background
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    // Divider
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(boxX, y);
    ctx.lineTo(boxX + boxW, y);
    ctx.stroke();

    // Forward text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.fillText(fwdText, x, y - 8);

    // Reverse text
    ctx.fillStyle = "#16a34a";
    ctx.fillText(revText, x, y + 8);

    // 选中时在信息框左上角绘制锁图标
    if (this.effectiveSelectedIds.includes(relation.id)) {
      this.drawLockIcon(ctx, boxX, boxY, Boolean(relation.locked));
    }
  }

  private drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
    const size = ARROW_SIZE * this.viewport.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.5);
    ctx.lineTo(-size, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawLockIcon(ctx: CanvasRenderingContext2D, x: number, y: number, locked: boolean): void {
    const w = 14, h = 12;
    ctx.fillStyle = locked ? "#f59e0b" : "#94a3b8";
    // Body
    ctx.fillRect(x, y + 3, w, h - 3);
    // Shackle
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 3, w / 3.5, Math.PI, 0);
    ctx.stroke();
    // Keyhole
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 7, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSelectionRect(ctx: CanvasRenderingContext2D): void {
    const rect = this.selectionRect;
    if (!rect) return;
    const sPos = this.worldToScreen(rect.x, rect.y);
    const w = rect.width * this.viewport.scale;
    const h = rect.height * this.viewport.scale;
    ctx.save();
    ctx.fillStyle = "rgba(37, 99, 235, 0.08)";
    ctx.fillRect(sPos.x, sPos.y, w, h);
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(sPos.x, sPos.y, w, h);
    ctx.restore();
  }

  private drawCreationPreview(ctx: CanvasRenderingContext2D): void {
    // Draw a faint circle at center to indicate creation mode
    if (this.createState.type === "none") return;
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16) || 37;
    const g = parseInt(hex.slice(3, 5), 16) || 99;
    const b = parseInt(hex.slice(5, 7), 16) || 235;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── 命中检测 ─────────────────────────────────────

  private hitTestModel(wx: number, wy: number): ModelNode | undefined {
    const r = NODE_RADIUS;
    for (let i = this.models.length - 1; i >= 0; i--) {
      const m = this.models[i];
      if (pointInCircle(wx, wy, m.x, m.y, r)) return m;
    }
    return undefined;
  }

  /** 检测屏幕坐标是否命中选中模型/关系的锁图标。 */
  private hitTestLockIcon(sx: number, sy: number): { type: "model" | "relation"; id: string } | undefined {
    const r = NODE_RADIUS * this.viewport.scale;
    const padding = 8;
    const iconW = 14, iconH = 12;

    // 检查模型锁图标
    for (const model of this.models) {
      if (!this.selectedIds.includes(model.id)) continue;
      const sPos = this.worldToScreen(model.x, model.y);
      const iconX = sPos.x - r - padding;
      const iconY = sPos.y - r - padding;
      if (sx >= iconX && sx <= iconX + iconW && sy >= iconY && sy <= iconY + iconH) {
        return { type: "model", id: model.id };
      }
    }

    // 检查关系信息框锁图标
    for (const relation of this.relations) {
      if (relation.relationType === "inherit") continue;
      if (!this.selectedIds.includes(relation.id)) continue;
      const source = this.models.find((m) => m.id === relation.sourceId);
      const target = this.models.find((m) => m.id === relation.targetId);
      if (!source || !target) continue;
      const sPos = this.worldToScreen(source.x, source.y);
      const tPos = this.worldToScreen(target.x, target.y);
      const infoPos = relation.position
        ? this.worldToScreen(relation.position.x, relation.position.y)
        : midpoint(sPos, tPos);
      const boxW = 86, boxH = 34;
      const iconX = infoPos.x - boxW / 2;
      const iconY = infoPos.y - boxH / 2;
      if (sx >= iconX && sx <= iconX + iconW && sy >= iconY && sy <= iconY + iconH) {
        return { type: "relation", id: relation.id };
      }
    }

    return undefined;
  }

  private hitTestInfoBox(wx: number, wy: number): ModelRelation | undefined {
    const halfW = 30, halfH = 20;
    for (const relation of this.relations) {
      if (relation.relationType === "inherit") continue;
      const source = this.models.find((m) => m.id === relation.sourceId);
      const target = this.models.find((m) => m.id === relation.targetId);
      if (!source || !target) continue;
      const pos = relation.position ?? midpoint(source, target);
      if (pointInRect(wx, wy, { x: pos.x - halfW, y: pos.y - halfH, width: halfW * 2, height: halfH * 2 })) {
        return relation;
      }
    }
    return undefined;
  }

  private hitTestRelation(wx: number, wy: number): ModelRelation | undefined {
    const threshold = 8 / this.viewport.scale;
    for (const relation of this.relations) {
      const source = this.models.find((m) => m.id === relation.sourceId);
      const target = this.models.find((m) => m.id === relation.targetId);
      if (!source || !target) continue;

      if (relation.relationType === "inherit") {
        // Check distance to line segment
        const d = this.distToSegment(wx, wy, source.x, source.y, target.x, target.y);
        if (d <= threshold) return relation;
        continue;
      }

      const hasCustomPos = !!relation.position;
      const infoPos = relation.position ?? midpoint(source, target);

      if (hasCustomPos || relation.locked) {
        // Check distance to two bezier curves (approximate with line segments)
        const d1 = this.distToSegment(wx, wy, source.x, source.y, infoPos.x, infoPos.y);
        const d2 = this.distToSegment(wx, wy, infoPos.x, infoPos.y, target.x, target.y);
        if (d1 <= threshold || d2 <= threshold) return relation;
      } else {
        // Check distance to two straight lines
        const d1 = this.distToSegment(wx, wy, infoPos.x, infoPos.y, source.x, source.y);
        const d2 = this.distToSegment(wx, wy, infoPos.x, infoPos.y, target.x, target.y);
        if (d1 <= threshold || d2 <= threshold) return relation;
      }
    }
    return undefined;
  }

  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // ── 事件处理 ─────────────────────────────────────

  onCanvasPointerDown(event: Msom.EventSystem.PointerEvent<HTMLCanvasElement>): void {
    event.preventDefault();
    if (this.loading) return;

    // 优先检测锁图标点击（屏幕坐标）
    const els = this.getCanvasElements();
    if (els) {
      const rect = els.canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const lockHit = this.hitTestLockIcon(sx, sy);
      if (lockHit) {
        if (lockHit.type === "model") {
          const model = this.models.find((m) => m.id === lockHit.id);
          if (model) void this.toggleModelLock(model);
        } else {
          const rel = this.relations.find((r) => r.id === lockHit.id);
          if (rel) void this.toggleRelationLock(rel);
        }
        return;
      }
    }

    const point = this.getCanvasPoint(event);

    // Create mode
    if (this.createState.type !== "none" && !this.readOnly) {
      this.handleCreateClick(point);
      return;
    }

    // Hit test models
    const model = this.hitTestModel(point.x, point.y);
    if (model) {
      if (this.readOnly) {
        this.selectedIds = [model.id];
        this.openModelDrawer(model);
        this.invalidate();
        return;
      }
      this.beginModelDrag(event, model, point);
      return;
    }

    // Hit test info boxes
    const infoRel = this.hitTestInfoBox(point.x, point.y);
    if (infoRel) {
      if (this.readOnly) {
        this.selectedIds = [infoRel.id];
        this.openRelationDrawer(infoRel);
        this.invalidate();
        return;
      }
      this.beginInfoBoxDrag(event, infoRel, point);
      return;
    }

    // Hit test relations
    const rel = this.hitTestRelation(point.x, point.y);
    if (rel) {
      this.selectedIds = [rel.id];
      this.openRelationDrawer(rel);
      this.invalidate();
      return;
    }

    // Empty canvas
    if (this.readOnly || event.button !== 0) {
      this.beginPan(event);
    } else {
      this.beginBoxSelect(event, point);
    }
  }

  onCanvasWheel(event: Msom.EventSystem.WheelEvent<HTMLCanvasElement>): void {
    event.preventDefault();
    const canvas = this.canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = clamp(this.viewport.scale * delta, MIN_SCALE, MAX_SCALE);
    const ratio = newScale / this.viewport.scale;

    this.viewport = {
      scale: newScale,
      offsetX: mx - (mx - this.viewport.offsetX) * ratio,
      offsetY: my - (my - this.viewport.offsetY) * ratio,
    };
    this.invalidate();
  }

  // ── 模型拖动 ─────────────────────────────────────

  private beginModelDrag(
    event: Msom.EventSystem.PointerEvent<HTMLCanvasElement>,
    model: ModelNode,
    startPoint: ModelPosition
  ): void {
    event.stopPropagation();
    // 已在选中集合中时保持当前选择（支持框选整体拖动），否则切换为单选
    if (!this.selectedIds.includes(model.id)) {
      this.selectSingle(model.id, event.shiftKey);
    }

    if (model.locked || event.button !== 0) {
      this.invalidate();
      return;
    }

    const startScreen = { x: event.clientX, y: event.clientY };
    let isDragging = false;
    const selectedSet = new Set(this.selectedIds);
    const origins = new Map<string, ModelPosition>();
    for (const id of selectedSet) {
      const m = this.models.find((item) => item.id === id);
      if (m && !m.locked) origins.set(id, { x: m.x, y: m.y });
    }

    const onMove = (nativeEvent: PointerEvent) => {
      const dx = nativeEvent.clientX - startScreen.x;
      const dy = nativeEvent.clientY - startScreen.y;
      if (!isDragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      isDragging = true;

      const isBoxDrag = selectedSet.size > 1;
      for (const [id, orig] of origins) {
        const m = this.models.find((item) => item.id === id);
        if (!m) continue;
        if (isBoxDrag) {
          m.x = orig.x + dx / this.viewport.scale;
          m.y = orig.y + dy / this.viewport.scale;
        } else {
          m.x = snapToGrid(orig.x + dx / this.viewport.scale, BASE_GRID);
          m.y = snapToGrid(orig.y + dy / this.viewport.scale, BASE_GRID);
        }
      }
      // 拖拽中只需画布重绘，不触发组件重渲染
      this.invalidate();
    };

    const onEnd = () => {
      this.dragCleanup?.();
      this.dragCleanup = undefined;
      if (!isDragging) {
        // Click: open drawer
        this.openModelDrawer(model);
        return;
      }
      // Auto-lock dragged models
      let modelsChanged = false;
      for (const id of origins.keys()) {
        const m = this.models.find((item) => item.id === id);
        if (m && !m.locked) {
          m.locked = true;
          modelsChanged = true;
          void this.service.updateModel(m.id, { locked: true }).catch(() => {});
        }
      }
      // Auto-lock selected relations (non-inherit)
      let relationsChanged = false;
      for (const id of this.selectedIds) {
        const rel = this.relations.find((r) => r.id === id);
        if (rel && rel.relationType !== "inherit" && !rel.locked) {
          rel.locked = true;
          relationsChanged = true;
          void this.service.updateRelation(rel.id, { locked: true }).catch(() => {});
        }
      }
      if (modelsChanged || relationsChanged) this.fieldVersion++;
      this.invalidate();
      // Commit positions
      for (const [id, orig] of origins) {
        const m = this.models.find((item) => item.id === id);
        if (m && (m.x !== orig.x || m.y !== orig.y)) {
          void this.commitModelPosition(m);
        }
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    this.dragCleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }

  private async commitModelPosition(model: ModelNode): Promise<void> {
    try {
      await this.service.updateModelPosition(model.id, { x: model.x, y: model.y });
      this.pendingModelPositions.delete(model.id);
    } catch (error) {
      this.pendingModelPositions.set(model.id, { x: model.x, y: model.y });
      this.error = this.getErrorMessage(error, "提交模型位置失败");
    }
  }

  // ── 信息框拖动 ───────────────────────────────────

  private beginInfoBoxDrag(
    event: Msom.EventSystem.PointerEvent<HTMLCanvasElement>,
    relation: ModelRelation,
    startPoint: ModelPosition
  ): void {
    event.stopPropagation();
    this.selectSingle(relation.id, false);

    if (relation.locked || event.button !== 0) {
      this.invalidate();
      return;
    }

    const startScreen = { x: event.clientX, y: event.clientY };
    const source = this.models.find((m) => m.id === relation.sourceId);
    const target = this.models.find((m) => m.id === relation.targetId);
    const origin = relation.position ?? (source && target ? midpoint(source, target) : startPoint);

    const onMove = (nativeEvent: PointerEvent) => {
      const dx = (nativeEvent.clientX - startScreen.x) / this.viewport.scale;
      const dy = (nativeEvent.clientY - startScreen.y) / this.viewport.scale;
      relation.position = { x: origin.x + dx, y: origin.y + dy };
      this.invalidate();
    };

    const onEnd = () => {
      this.dragCleanup?.();
      this.dragCleanup = undefined;
      // Auto-lock relation
      relation.locked = true;
      this.fieldVersion++;
      this.invalidate();
      void this.commitRelationPosition(relation);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    this.dragCleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }

  private async commitRelationPosition(relation: ModelRelation): Promise<void> {
    try {
      await this.service.updateRelation(relation.id, { position: relation.position });
    } catch (error) {
      this.error = this.getErrorMessage(error, "提交关系位置失败");
    }
  }

  // ── 框选 ─────────────────────────────────────────

  private selectionRect: SelectionRect | undefined;
  private pendingSelectedIds: string[] = [];
  @observer()
  declare selectionActive: boolean;

  private beginBoxSelect(event: Msom.EventSystem.PointerEvent<HTMLCanvasElement>, startPoint: ModelPosition): void {
    this.drawer = { type: "closed" };
    this.selectedIds = [];
    this.pendingSelectedIds = [];
    this.selectionActive = true;

    const startScreen = { x: event.clientX, y: event.clientY };

    const onMove = (nativeEvent: PointerEvent) => {
      const cur = this.getCanvasPoint(nativeEvent);

      this.selectionRect = {
        x: Math.min(startPoint.x, cur.x),
        y: Math.min(startPoint.y, cur.y),
        width: Math.abs(cur.x - startPoint.x),
        height: Math.abs(cur.y - startPoint.y),
      };

      // Hit test models
      const ids: string[] = [];
      for (const model of this.models) {
        if (circleIntersectsRect(model.x, model.y, NODE_RADIUS, this.selectionRect!)) {
          ids.push(model.id);
        }
      }
      // Hit test relations (non-inherit)
      for (const relation of this.relations) {
        if (relation.relationType === "inherit") continue;
        const source = this.models.find((m) => m.id === relation.sourceId);
        const target = this.models.find((m) => m.id === relation.targetId);
        if (!source || !target) continue;
        const infoPos = relation.position ?? midpoint(source, target);
        // Check if line segments intersect the selection rect
        if (
          lineIntersectsRect(infoPos.x, infoPos.y, source.x, source.y, this.selectionRect!) ||
          lineIntersectsRect(infoPos.x, infoPos.y, target.x, target.y, this.selectionRect!)
        ) {
          ids.push(relation.id);
        }
      }
      // 框选中只更新待定选中列表，不触发组件重渲染
      this.pendingSelectedIds = ids;
      this.invalidate();
    };

    const onEnd = () => {
      this.dragCleanup?.();
      this.dragCleanup = undefined;
      this.selectionRect = undefined;
      this.selectionActive = false;
      // 框选结束后一次性提交选中结果
      this.selectedIds = this.pendingSelectedIds;
      this.pendingSelectedIds = [];
      this.invalidate();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    this.dragCleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }

  // ── 平移 ─────────────────────────────────────────

  private beginPan(event: Msom.EventSystem.PointerEvent<HTMLCanvasElement>): void {
    const startScreen = { x: event.clientX, y: event.clientY };
    const origin = { ...this.viewport };

    const onMove = (nativeEvent: PointerEvent) => {
      this.viewport = {
        ...origin,
        offsetX: origin.offsetX + (nativeEvent.clientX - startScreen.x),
        offsetY: origin.offsetY + (nativeEvent.clientY - startScreen.y),
      };
      this.invalidate();
    };

    const onEnd = () => {
      this.dragCleanup?.();
      this.dragCleanup = undefined;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    this.dragCleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }

  // ── 缩放控制 ─────────────────────────────────────

  zoomBy(factor: number): void {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    const newScale = clamp(this.viewport.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio = newScale / this.viewport.scale;
    this.viewport = {
      scale: newScale,
      offsetX: cx - (cx - this.viewport.offsetX) * ratio,
      offsetY: cy - (cy - this.viewport.offsetY) * ratio,
    };
    this.invalidate();
  }

  resetViewport(): void {
    this.viewport = { offsetX: 0, offsetY: 0, scale: 1 };
    this.invalidate();
  }

  // ── 创建模式 ─────────────────────────────────────

  enterCreateMode(type: "model" | "relation" | "inherit"): void {
    if (this.readOnly) return;
    if (type === "model") {
      this.createState = { type: "model" };
    } else if (type === "relation") {
      this.createState = { type: "relation", step: "source" };
    } else {
      this.createState = { type: "inherit", step: "child" };
    }
    this.drawer = { type: "closed" };
    this.selectedIds = [];
    this.invalidate();
  }

  exitCreateMode(): void {
    this.createState = { type: "none" };
    this.invalidate();
  }

  private get createHint(): string {
    if (this.createState.type === "model") return "点击画布放置模型";
    if (this.createState.type === "relation") {
      return this.createState.step === "source" ? "点击源模型" : "点击目标模型";
    }
    if (this.createState.type === "inherit") {
      return this.createState.step === "child" ? "点击子模型" : "点击父模型";
    }
    return "";
  }

  private handleCreateClick(point: ModelPosition): void {
    if (this.createState.type === "model") {
      const x = snapToGrid(point.x, BASE_GRID);
      const y = snapToGrid(point.y, BASE_GRID);
      void this.createModelAt(x, y);
      this.exitCreateMode();
      return;
    }

    if (this.createState.type === "relation") {
      const model = this.hitTestModel(point.x, point.y);
      if (!model) {
        this.exitCreateMode();
        return;
      }
      if (this.createState.step === "source") {
        this.createState = { type: "relation", step: "target", sourceId: model.id };
        this.selectedIds = [model.id];
        this.invalidate();
      } else if (this.createState.sourceId) {
        void this.createRelationBetween(this.createState.sourceId, model.id);
        this.exitCreateMode();
      }
      return;
    }

    if (this.createState.type === "inherit") {
      const model = this.hitTestModel(point.x, point.y);
      if (!model) {
        this.exitCreateMode();
        return;
      }
      if (this.createState.step === "child") {
        this.createState = { type: "inherit", step: "parent", childId: model.id };
        this.selectedIds = [model.id];
        this.invalidate();
      } else if (this.createState.childId) {
        void this.createInheritanceBetween(this.createState.childId, model.id);
        this.exitCreateMode();
      }
      return;
    }
  }

  // ── CRUD ─────────────────────────────────────────

  private async createModelAt(x: number, y: number): Promise<void> {
    this.saving = true;
    this.error = undefined;
    try {
      const colorIdx = this.models.length % MODEL_COLORS.length;
      const model = await this.service.createModel({
        name: `模型${this.models.length + 1}`,
        description: "",
        color: MODEL_COLORS[colorIdx],
        x,
        y,
        fields: [],
      });
      this.models = [...this.models, model];
      this.openModelDrawer(model);
    } catch (error) {
      this.error = this.getErrorMessage(error, "创建模型失败");
    } finally {
      this.saving = false;
      this.invalidate();
    }
  }

  private async createRelationBetween(sourceId: string, targetId: string): Promise<void> {
    this.saving = true;
    this.error = undefined;
    try {
      const source = this.models.find((m) => m.id === sourceId);
      const target = this.models.find((m) => m.id === targetId);
      const fwdName = target?.id ?? "";
      const revName = source?.id ?? "";
      const relation = await this.service.createRelation({
        sourceId,
        targetId,
        relationType: "relation",
        forward: { name: fwdName, source: sourceId, target: targetId, mappingType: "1" },
        reverse: { name: revName, source: targetId, target: sourceId, mappingType: "m" },
      });
      this.relations = [...this.relations, relation];
      this.openRelationDrawer(relation);
    } catch (error) {
      this.error = this.getErrorMessage(error, "创建关系失败");
    } finally {
      this.saving = false;
      this.invalidate();
    }
  }

  private async createInheritanceBetween(childId: string, parentId: string): Promise<void> {
    // 成环检查：沿 childModelIds 递归，若 parentId 是 childId 的后代则拒绝
    if (this.isDescendant(parentId, childId)) {
      this.error = "创建继承关系失败：目标父模型是子模型的后代，将形成继承环";
      this.invalidate();
      return;
    }
    if (childId === parentId) {
      this.error = "创建继承关系失败：不能继承自身";
      this.invalidate();
      return;
    }
    this.saving = true;
    this.error = undefined;
    try {
      const relation = await this.service.createRelation({
        sourceId: childId,
        targetId: parentId,
        relationType: "inherit",
      });
      this.relations = [...this.relations, relation];
      // Update model parent reference
      const child = this.models.find((m) => m.id === childId);
      if (child) {
        child.parentModelId = parentId;
      }
      const parent = this.models.find((m) => m.id === parentId);
      if (parent) {
        parent.childModelIds = [...(parent.childModelIds ?? []), childId];
      }
      this.fieldVersion++;
    } catch (error) {
      this.error = this.getErrorMessage(error, "创建继承关系失败");
    } finally {
      this.saving = false;
      this.invalidate();
    }
  }

  /** 检查 targetId 是否是 rootId 的后代（沿 childModelIds 递归）。 */
  private isDescendant(rootId: string, targetId: string): boolean {
    const visited = new Set<string>();
    const stack = [rootId];
    while (stack.length > 0) {
      const curId = stack.pop()!;
      if (visited.has(curId)) continue;
      visited.add(curId);
      const model = this.models.find((m) => m.id === curId);
      if (!model?.childModelIds) continue;
      for (const childId of model.childModelIds) {
        if (childId === targetId) return true;
        stack.push(childId);
      }
    }
    return false;
  }

  // ── 选择 ─────────────────────────────────────────

  private selectSingle(id: string, additive: boolean): void {
    if (additive) {
      this.selectedIds = this.selectedIds.includes(id)
        ? this.selectedIds.filter((item) => item !== id)
        : [...this.selectedIds, id];
    } else {
      this.selectedIds = [id];
    }
  }

  // ── 删除 ─────────────────────────────────────────

  async deleteSelected(): Promise<void> {
    if (!this.selectedIds.length || this.readOnly) return;

    const modelIds = this.selectedIds.filter((id) => this.models.some((m) => m.id === id));
    const relationIds = this.selectedIds.filter((id) => this.relations.some((r) => r.id === id));
    const selectedSet = new Set(this.selectedIds);

    // 递归检查：被删模型的子模型是否全部在选中集合中
    for (const mid of modelIds) {
      const model = this.models.find((m) => m.id === mid);
      if (!model?.childModelIds) continue;
      for (const childId of model.childModelIds) {
        if (!selectedSet.has(childId)) {
          const child = this.models.find((m) => m.id === childId);
          this.error = `无法删除模型「${model.name}」：存在未被选中的子模型「${child?.name ?? childId}」，请先选中子模型`;
          this.invalidate();
          return;
        }
      }
    }

    this.saving = true;
    this.error = undefined;
    try {
      // 删除关系：排除端点属于被删模型集合的关系（模型删除时会级联删除）
      const relationsToDelete = relationIds.filter((rid) => {
        const rel = this.relations.find((r) => r.id === rid);
        if (!rel) return false;
        if (modelIds.includes(rel.sourceId) || modelIds.includes(rel.targetId)) return false;
        return true;
      });

      for (const rid of relationsToDelete) {
        await this.service.deleteRelation(rid);
      }
      this.relations = this.relations.filter((r) => !relationsToDelete.includes(r.id));

      // 按拓扑序删除模型：子模型先于父模型
      const deleteOrder = this.sortForDeletion(modelIds);
      for (const mid of deleteOrder) {
        await this.service.deleteModel(mid);
        this.relations = this.relations.filter(
          (r) => r.sourceId !== mid && r.targetId !== mid
        );
      }
      this.models = this.models.filter((m) => !modelIds.includes(m.id));

      // 清理剩余模型的父/子 ID 引用
      for (const model of this.models) {
        if (model.childModelIds) {
          model.childModelIds = model.childModelIds.filter((id) => !modelIds.includes(id));
        }
        if (model.parentModelId && modelIds.includes(model.parentModelId)) {
          model.parentModelId = null;
        }
      }
      this.fieldVersion++;

      this.selectedIds = [];
      this.drawer = { type: "closed" };
    } catch (error) {
      this.error = this.getErrorMessage(error, "删除失败");
      await this.load();
    } finally {
      this.saving = false;
      this.invalidate();
    }
  }

  /** 拓扑排序：后序 DFS 确保子模型先于父模型删除。 */
  private sortForDeletion(modelIds: string[]): string[] {
    const idSet = new Set(modelIds);
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const model = this.models.find((m) => m.id === id);
      if (model?.childModelIds) {
        for (const childId of model.childModelIds) {
          if (idSet.has(childId)) visit(childId);
        }
      }
      result.push(id);
    };

    for (const id of modelIds) visit(id);
    return result;
  }

  async deleteRelation(id: string): Promise<void> {
    const relation = this.relations.find((r) => r.id === id);
    if (!relation || this.readOnly) return;
    this.saving = true;
    try {
      await this.service.deleteRelation(id);
      this.relations = this.relations.filter((r) => r.id !== id);

      // 继承关系删除后清理父/子引用
      if (relation.relationType === "inherit") {
        const child = this.models.find((m) => m.id === relation.sourceId);
        const parent = this.models.find((m) => m.id === relation.targetId);
        if (child) child.parentModelId = null;
        if (parent?.childModelIds) {
          parent.childModelIds = parent.childModelIds.filter((cid) => cid !== relation.sourceId);
        }
        this.fieldVersion++;
      }

      this.drawer = { type: "closed" };
      this.selectedIds = this.selectedIds.filter((sid) => sid !== id);
    } catch (error) {
      this.error = this.getErrorMessage(error, "删除关系失败");
    } finally {
      this.saving = false;
      this.invalidate();
    }
  }

  // ── 模式切换 ─────────────────────────────────────

  async toggleMode(): Promise<void> {
    const prev = this.readOnly;
    this.readOnly = !prev;
    this.createState = { type: "none" };
    try {
      await this.service.setLocked(this.readOnly);
    } catch (error) {
      this.readOnly = prev;
      this.error = this.getErrorMessage(error, "更新模式失败");
    }
    this.invalidate();
  }

  // ── 同步位置 ─────────────────────────────────────

  async syncPositions(): Promise<void> {
    if (this.readOnly) return;
    this.saving = true;
    this.error = undefined;
    try {
      for (const model of this.models) {
        await this.service.updateModelPosition(model.id, { x: model.x, y: model.y });
      }
      for (const relation of this.relations) {
        if (relation.position) {
          await this.service.updateRelation(relation.id, { position: relation.position });
        }
      }
      this.pendingModelPositions.clear();
    } catch (error) {
      this.error = this.getErrorMessage(error, "同步位置失败");
    } finally {
      this.saving = false;
    }
  }

  // ── 锁定 ─────────────────────────────────────────

  async toggleModelLock(model: ModelNode): Promise<void> {
    if (this.readOnly) return;
    const prev = Boolean(model.locked);
    model.locked = !prev;
    this.fieldVersion++;
    this.invalidate();
    try {
      await this.service.updateModel(model.id, { locked: model.locked });
    } catch (error) {
      model.locked = prev;
      this.fieldVersion++;
      this.error = this.getErrorMessage(error, "更新锁定状态失败");
      this.invalidate();
    }
  }

  async toggleRelationLock(relation: ModelRelation): Promise<void> {
    if (this.readOnly) return;
    const prev = Boolean(relation.locked);
    relation.locked = !prev;
    if (!relation.locked) {
      // Unlocking resets to straight
      relation.position = undefined;
    }
    this.fieldVersion++;
    this.invalidate();
    try {
      await this.service.updateRelation(relation.id, { locked: relation.locked, position: relation.position });
    } catch (error) {
      relation.locked = prev;
      this.fieldVersion++;
      this.error = this.getErrorMessage(error, "更新关系锁定状态失败");
      this.invalidate();
    }
  }

  // ── 抽屉 ─────────────────────────────────────────

  private openModelDrawer(model: ModelNode): void {
    this.drawer = {
      type: "model",
      id: model.id,
      modelId: model.id,
      name: model.name,
      description: model.description || "",
      color: model.color || "#2563eb",
    };
  }

  private openRelationDrawer(relation: ModelRelation): void {
    this.drawer = {
      type: "relation",
      id: relation.id,
      fwdName: relation.forward?.name ?? "",
      fwdMapping: relation.forward?.mappingType ?? "1",
      revName: relation.reverse?.name ?? "",
      revMapping: relation.reverse?.mappingType ?? "m",
    };
  }

  private closeDrawer(): void {
    this.drawer = { type: "closed" };
  }

  private updateDrawerDraft(patch: Partial<{ modelId: string; name: string; description: string; color: string; fwdName: string; fwdMapping: string; revName: string; revMapping: string }>): void {
    const d = this.drawer;
    if (d.type === "closed") return;
    this.drawer = { ...d, ...patch } as DrawerState;
  }

  async saveDrawer(): Promise<void> {
    const drawer = this.drawer;
    if (drawer.type === "model") {
      const model = this.models.find((m) => m.id === drawer.id);
      if (!model || this.readOnly) return;
      const newModelId = drawer.modelId.trim();
      const patch: ModelPatch = {
        id: newModelId,
        name: drawer.name.trim(),
        description: drawer.description.trim(),
        color: drawer.color,
      };
      const prev = { id: model.id, name: model.name, description: model.description, color: model.color };
      const oldId = model.id;
      Object.assign(model, patch);
      this.fieldVersion++;
      // 更新关联关系中的模型 ID 引用
      if (newModelId !== oldId) {
        for (const rel of this.relations) {
          if (rel.sourceId === oldId) rel.sourceId = newModelId;
          if (rel.targetId === oldId) rel.targetId = newModelId;
          if (rel.forward) {
            if (rel.forward.source === oldId) rel.forward.source = newModelId;
            if (rel.forward.target === oldId) rel.forward.target = newModelId;
          }
          if (rel.reverse) {
            if (rel.reverse.source === oldId) rel.reverse.source = newModelId;
            if (rel.reverse.target === oldId) rel.reverse.target = newModelId;
          }
        }
      }
      this.saving = true;
      this.invalidate();
      try {
        await this.service.updateModel(oldId, patch);
        this.drawer = { ...drawer, id: newModelId };
      } catch (error) {
        Object.assign(model, prev);
        if (newModelId !== oldId) {
          for (const rel of this.relations) {
            if (rel.sourceId === newModelId) rel.sourceId = oldId;
            if (rel.targetId === newModelId) rel.targetId = oldId;
            if (rel.forward) {
              if (rel.forward.source === newModelId) rel.forward.source = oldId;
              if (rel.forward.target === newModelId) rel.forward.target = oldId;
            }
            if (rel.reverse) {
              if (rel.reverse.source === newModelId) rel.reverse.source = oldId;
              if (rel.reverse.target === newModelId) rel.reverse.target = oldId;
            }
          }
        }
        this.fieldVersion++;
        this.error = this.getErrorMessage(error, "保存模型失败");
      } finally {
        this.saving = false;
        this.invalidate();
      }
    } else if (drawer.type === "relation") {
      const relation = this.relations.find((r) => r.id === drawer.id);
      if (!relation || this.readOnly) return;
      const prevFwd = relation.forward ? { ...relation.forward } : undefined;
      const prevRev = relation.reverse ? { ...relation.reverse } : undefined;
      if (relation.forward) {
        relation.forward.name = drawer.fwdName;
        relation.forward.mappingType = drawer.fwdMapping as RelationDirection["mappingType"];
      }
      if (relation.reverse) {
        relation.reverse.name = drawer.revName;
        relation.reverse.mappingType = drawer.revMapping as RelationDirection["mappingType"];
      }
      this.fieldVersion++;
      this.saving = true;
      this.invalidate();
      try {
        await this.service.updateRelation(relation.id, {
          forward: relation.forward,
          reverse: relation.reverse,
        });
      } catch (error) {
        if (relation.forward && prevFwd) relation.forward = prevFwd;
        if (relation.reverse && prevRev) relation.reverse = prevRev;
        this.fieldVersion++;
        this.error = this.getErrorMessage(error, "保存关系失败");
      } finally {
        this.saving = false;
        this.invalidate();
      }
    }
  }

  // ── 字段管理 ─────────────────────────────────────

  async toggleInheritedFields(model: ModelNode): Promise<void> {
    if (this.readOnly) return;
    const prev = model.showInheritedFields;
    model.showInheritedFields = prev === false;
    this.fieldVersion++;
    this.invalidate();
    try {
      await this.service.updateModel(model.id, { showInheritedFields: model.showInheritedFields });
    } catch (error) {
      model.showInheritedFields = prev;
      this.fieldVersion++;
      this.error = this.getErrorMessage(error, "更新继承字段显隐失败");
      this.invalidate();
    }
  }

  addField(model: ModelNode): void {
    if (this.readOnly || model.locked) return;
    const newField: ModelField = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: "新字段",
      type: "String",
      description: "",
    };
    model.fields = [...(model.fields ?? []).filter((f) => !f.inherited), newField];
    this.fieldVersion++;
    this.expandedFields.add(newField.id);
    this.invalidate();
    void this.service.updateModel(model.id, { fields: model.fields }).catch((e) => {
      this.error = this.getErrorMessage(e, "添加字段失败");
    });
  }

  removeField(model: ModelNode, fieldId: string): void {
    if (this.readOnly || model.locked) return;
    model.fields = (model.fields ?? []).filter((f) => f.id !== fieldId || f.inherited);
    this.fieldVersion++;
    this.expandedFields.delete(fieldId);
    this.invalidate();
    void this.service.updateModel(model.id, { fields: model.fields }).catch((e) => {
      this.error = this.getErrorMessage(e, "删除字段失败");
    });
  }

  updateField(model: ModelNode, fieldId: string, patch: Partial<ModelField>): void {
    if (this.readOnly || model.locked) return;
    const field = (model.fields ?? []).find((f) => f.id === fieldId);
    if (!field || field.inherited) return;
    Object.assign(field, patch);
    this.fieldVersion++;
    this.invalidate();
    void this.service.updateModel(model.id, { fields: model.fields }).catch((e) => {
      this.error = this.getErrorMessage(e, "更新字段失败");
    });
  }

  moveField(model: ModelNode, fieldId: string, dir: -1 | 1): void {
    if (this.readOnly || model.locked) return;
    const ownFields = (model.fields ?? []).filter((f) => !f.inherited);
    const idx = ownFields.findIndex((f) => f.id === fieldId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= ownFields.length) return;
    const tmp = ownFields[idx];
    ownFields[idx] = ownFields[newIdx];
    ownFields[newIdx] = tmp;
    const inheritedFields = (model.fields ?? []).filter((f) => f.inherited);
    model.fields = [...inheritedFields, ...ownFields];
    this.fieldVersion++;
    this.invalidate();
    void this.service.updateModel(model.id, { fields: model.fields }).catch((e) => {
      this.error = this.getErrorMessage(e, "排序字段失败");
    });
  }

  toggleFieldExpand(fieldId: string): void {
    if (this.expandedFields.has(fieldId)) {
      this.expandedFields.delete(fieldId);
    } else {
      this.expandedFields.add(fieldId);
    }
    this.fieldVersion++;
    this.invalidate();
  }

  // ── 渲染 JSX ─────────────────────────────────────

  render() {
    this.dirty = true;
    return (
      <section class={["model-designer", this.props.class]}>
        <header class="model-designer__toolbar">
          <span class="model-designer__toolbar-title">{this.title || "模型设计器"}</span>
          <span class="model-designer__toolbar-stats">{this.models.length} 模型 · {this.relations.length} 关系</span>
          <button
            class={this.readOnly ? "md-btn--ghost" : "md-btn--active"}
            onclick={() => void this.toggleMode()}
          >
            {this.readOnly ? "只读模式" : "编辑模式"}
          </button>
          <button
            class="md-btn--secondary"
            disabled={this.readOnly || this.saving}
            onclick={() => void this.syncPositions()}
          >
            同步位置
          </button>
          {this.selectedIds.length > 0 && (
            <button
              class="md-btn--danger"
              disabled={this.readOnly || this.saving}
              onclick={() => void this.deleteSelected()}
            >
              删除({this.selectedIds.length})
            </button>
          )}
        </header>

        {this.error && (
          <div class="model-designer__error">
            <span>{this.error}</span>
            <button title="关闭" onclick={() => (this.error = undefined)}>×</button>
          </div>
        )}

        <div class="model-designer__main">
          <aside class="model-designer__panel">
            <button
              disabled={this.readOnly}
              class={this.createState.type === "model" ? "md-btn--active" : ""}
              onclick={() => (this.createState.type === "model" ? this.exitCreateMode() : this.enterCreateMode("model"))}
            >
              创建模型
            </button>
            <button
              disabled={this.readOnly}
              class={this.createState.type === "relation" ? "md-btn--active" : "md-btn--secondary"}
              onclick={() => (this.createState.type === "relation" ? this.exitCreateMode() : this.enterCreateMode("relation"))}
            >
              创建关系
            </button>
            <button
              disabled={this.readOnly}
              class={this.createState.type === "inherit" ? "md-btn--active" : "md-btn--secondary"}
              onclick={() => (this.createState.type === "inherit" ? this.exitCreateMode() : this.enterCreateMode("inherit"))}
            >
              继承关系
            </button>
            <div class="model-designer__panel-hint">
              {this.createState.type !== "none" ? this.createHint : "点击按钮开始创建"}
            </div>
          </aside>

          <div class="model-designer__canvas-wrapper" $ref={this.wrapperRef}>
            <canvas
              $ref={this.canvasRef}
              class={[
                "model-designer__canvas",
                this.createState.type !== "none" && "is-creating",
                this.readOnly && "is-locked",
              ]}
              onPointerDown={(event) => this.onCanvasPointerDown(event)}
              onWheel={(event) => this.onCanvasWheel(event)}
            />
            {this.createState.type !== "none" && (
              <div class="model-designer__canvas-hint">{this.createHint}</div>
            )}
            <div class="model-designer__canvas-overlay">
              <button class="md-btn--ghost md-btn--sm" onclick={() => this.zoomBy(1.1)}>+</button>
              <button class="md-btn--ghost md-btn--sm" onclick={() => this.zoomBy(0.9)}>−</button>
              <button class="md-btn--ghost md-btn--sm" onclick={() => this.resetViewport()}>⟲</button>
            </div>
            {this.loading && <div class="model-designer__canvas-empty">正在加载模型数据…</div>}
            {!this.loading && !this.models.length && (
              <div class="model-designer__canvas-empty">画布为空，请创建第一个模型</div>
            )}
          </div>

          {this.renderDrawer()}
        </div>
      </section>
    );
  }

  private renderDrawer() {
    // 引用 fieldVersion，使 fieldVersion++ 能触发 DOM 重渲染（用于字段/属性就地更新）
    void this.fieldVersion;
    const drawer = this.drawer;
    if (drawer.type === "closed") return null;

    if (drawer.type === "model") {
      const model = this.models.find((m) => m.id === drawer.id);
      if (!model) return null;
      const ownFields = (model.fields ?? []).filter((f) => !f.inherited);
      const inheritedFields = (model.fields ?? []).filter((f) => f.inherited);
      const showInherited = model.showInheritedFields !== false;
      const editorLocked = this.readOnly || Boolean(model.locked);
      const otherModels = this.models.filter((m) => m.id !== model.id);

      return (
        <aside class="model-designer__drawer">
          <header class="model-designer__drawer-header">
            <strong>模型属性</strong>
            <button title="关闭" onclick={() => this.closeDrawer()}>×</button>
          </header>
          <div class="model-designer__drawer-body">
            <div class="model-designer__field">
              <span class="model-designer__field-label">模型 ID</span>
              <input
                value={drawer.modelId}
                disabled={editorLocked}
                onInput={(e) => this.updateDrawerDraft({ modelId: e.currentTarget.value })}
              />
            </div>
            <div class="model-designer__field">
              <span class="model-designer__field-label">名称</span>
              <input
                value={drawer.name}
                disabled={editorLocked}
                onInput={(e) => this.updateDrawerDraft({ name: e.currentTarget.value })}
              />
            </div>
            <div class="model-designer__field">
              <span class="model-designer__field-label">描述</span>
              <textarea
                value={drawer.description}
                disabled={editorLocked}
                onInput={(e) => this.updateDrawerDraft({ description: e.currentTarget.value })}
              />
            </div>
            <div class="model-designer__field">
              <span class="model-designer__field-label">颜色</span>
              <div class="model-designer__color-row">
                {MODEL_COLORS.map((c) => (
                  <button
                    class={["model-designer__color-swatch", drawer.color === c && "is-active"]}
                    style={{ background: c }}
                    disabled={editorLocked}
                    onclick={() => this.updateDrawerDraft({ color: c })}
                  />
                ))}
              </div>
            </div>
            <div class="model-designer__field">
              <span class="model-designer__field-label">继承模型</span>
              <select disabled={true} value={model.parentModelId ?? ""}>
                <option value="">无</option>
                {otherModels.map((m) => (
                  <option value={m.id}>{m.name}（{m.id}）</option>
                ))}
              </select>
            </div>

            <div class="model-designer__field-section">
              <div class="model-designer__field-section-header">
                <span>字段（{ownFields.length}）{inheritedFields.length > 0 && ` · 继承 ${inheritedFields.length}`}</span>
                {inheritedFields.length > 0 && (
                  <button class="model-designer__field-toggle" onclick={() => void this.toggleInheritedFields(model)}>
                    {showInherited ? "隐藏继承" : "显示继承"}
                  </button>
                )}
              </div>
              {showInherited && inheritedFields.length > 0 && (
                <ul class="model-designer__field-list">
                  {inheritedFields.map((field) => (
                    <li class={["model-designer__field-item", "is-inherited", this.expandedFields.has(field.id) && "is-expanded"]}>
                      <button class="model-designer__field-collapse" onclick={() => this.toggleFieldExpand(field.id)}>
                        {this.expandedFields.has(field.id) ? "▾" : "▸"}
                      </button>
                      <span class="field-name">{field.name}</span>
                      <span class="field-type">{field.type}</span>
                      <span style={{ fontSize: "10px", color: "#9ca3af" }}>继承</span>
                      {this.expandedFields.has(field.id) && field.description && (
                        <div class="field-desc">{field.description}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <ul class="model-designer__field-list">
                {ownFields.map((field, idx) => (
                  <li class={["model-designer__field-item", this.expandedFields.has(field.id) && "is-expanded"]}>
                    <button class="model-designer__field-collapse" onclick={() => this.toggleFieldExpand(field.id)}>
                      {this.expandedFields.has(field.id) ? "▾" : "▸"}
                    </button>
                    <input
                      class="field-name-input"
                      type="text"
                      value={field.name}
                      disabled={editorLocked}
                      onInput={(e: Event) => this.updateField(model, field.id, { name: (e.target as HTMLInputElement).value })}
                    />
                    <select
                      class="field-type-select"
                      disabled={editorLocked}
                      value={field.type}
                      onchange={(e: Event) => this.updateField(model, field.id, { type: (e.target as HTMLSelectElement).value })}
                    >
                      <option value="String">String</option>
                      <option value="Number">Number</option>
                      <option value="Boolean">Boolean</option>
                      <option value="Date">Date</option>
                      <option value="ObjectId">ObjectId</option>
                      <option value="Array">Array</option>
                      <option value="Object">Object</option>
                    </select>
                    <div class="model-designer__field-actions">
                      <button class="md-btn--ghost md-btn--sm" disabled={editorLocked || idx === 0} onclick={() => this.moveField(model, field.id, -1)}>↑</button>
                      <button class="md-btn--ghost md-btn--sm" disabled={editorLocked || idx === ownFields.length - 1} onclick={() => this.moveField(model, field.id, 1)}>↓</button>
                      <button class="md-btn--danger md-btn--sm" disabled={editorLocked} onclick={() => this.removeField(model, field.id)}>删</button>
                    </div>
                    {this.expandedFields.has(field.id) && (
                      <div class="field-desc">
                        <textarea
                          class="field-desc-input"
                          placeholder="字段描述"
                          disabled={editorLocked}
                          value={field.description ?? ""}
                          onInput={(e: Event) => this.updateField(model, field.id, { description: (e.target as HTMLTextAreaElement).value })}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <button class="md-btn--secondary md-btn--sm" disabled={editorLocked} onclick={() => this.addField(model)}>+ 添加字段</button>
            </div>

            <button class="md-btn--secondary" disabled={this.readOnly} onclick={() => void this.toggleModelLock(model)}>
              {model.locked ? "解锁模型" : "锁定模型"}
            </button>
          </div>
          <footer class="model-designer__drawer-footer">
            <button
              disabled={editorLocked || this.saving || !drawer.name.trim() || !drawer.modelId.trim()}
              onclick={() => void this.saveDrawer()}
            >
              {this.saving ? "保存中" : "保存"}
            </button>
          </footer>
        </aside>
      );
    }

    // Relation drawer
    const relation = this.relations.find((r) => r.id === drawer.id);
    if (!relation) return null;
    const editorLocked = this.readOnly || Boolean(relation.locked);
    const sourceModel = this.models.find((m) => m.id === relation.sourceId);
    const targetModel = this.models.find((m) => m.id === relation.targetId);

    return (
      <aside class="model-designer__drawer">
        <header class="model-designer__drawer-header">
          <strong>关系属性</strong>
          <button title="关闭" onclick={() => this.closeDrawer()}>×</button>
        </header>
        <div class="model-designer__drawer-body">
          <div class="model-designer__direction">
            <span class="model-designer__direction-title">
              {sourceModel?.name ?? relation.sourceId} → {targetModel?.name ?? relation.targetId}
            </span>
            <div class="model-designer__field">
              <span class="model-designer__field-label">关系名称</span>
              <input
                value={drawer.fwdName}
                disabled={editorLocked}
                onInput={(e) => this.updateDrawerDraft({ fwdName: e.currentTarget.value })}
              />
            </div>
            <div class="model-designer__field">
              <span class="model-designer__field-label">映射</span>
              <div class="model-designer__mapping-row">
                {(["1", "m", "n"] as const).map((m) => (
                  <button
                    class={drawer.fwdMapping === m ? "md-btn--active" : "md-btn--ghost"}
                    disabled={editorLocked}
                    onclick={() => this.updateDrawerDraft({ fwdMapping: m })}
                  >{m}</button>
                ))}
              </div>
            </div>
          </div>

          <div class="model-designer__direction">
            <span class="model-designer__direction-title">
              {targetModel?.name ?? relation.targetId} → {sourceModel?.name ?? relation.sourceId}
            </span>
            <div class="model-designer__field">
              <span class="model-designer__field-label">关系名称</span>
              <input
                value={drawer.revName}
                disabled={editorLocked}
                onInput={(e) => this.updateDrawerDraft({ revName: e.currentTarget.value })}
              />
            </div>
            <div class="model-designer__field">
              <span class="model-designer__field-label">映射</span>
              <div class="model-designer__mapping-row">
                {(["1", "m", "n"] as const).map((m) => (
                  <button
                    class={drawer.revMapping === m ? "md-btn--active" : "md-btn--ghost"}
                    disabled={editorLocked}
                    onclick={() => this.updateDrawerDraft({ revMapping: m })}
                  >{m}</button>
                ))}
              </div>
            </div>
          </div>

          <button class="md-btn--secondary" disabled={this.readOnly} onclick={() => void this.toggleRelationLock(relation)}>
            {relation.locked ? "解锁关系" : "锁定关系"}
          </button>
        </div>
        <footer class="model-designer__drawer-footer">
          <button class="md-btn--danger" disabled={editorLocked || this.saving} onclick={() => void this.deleteRelation(relation.id)}>删除</button>
          <button
            disabled={editorLocked || this.saving}
            onclick={() => void this.saveDrawer()}
          >
            {this.saving ? "保存中" : "保存"}
          </button>
        </footer>
      </aside>
    );
  }

  /** 兼容初始版本的编程式节点添加能力。 */
  add(node: Msom.MsomNode): void {
    console.warn("ModelDesigner.add 已废弃，请通过 api.createModel 创建模型", node);
  }
}

export { ModelDesigner };

export function mountModelDesigner(
  container: HTMLElement,
  props: Omit<ModelDesignerProps, "$ref"> = {}
): SingleRef<ModelDesigner> {
  const designerRef: SingleRef<ModelDesigner> = createSingleRef();
  mountWith(() => <ModelDesigner {...props} $ref={designerRef} />, container);
  return designerRef;
}
