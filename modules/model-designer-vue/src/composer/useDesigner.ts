import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from "vue";
import type {
  ModelDesignerApi,
  ModelDesignerBootstrap,
  ModelField,
  ModelNode,
  ModelPatch,
  ModelPosition,
  ModelRelation,
} from "../types";
import { createHttpModelDesignerApi } from "../api";
import {
  ARROW_GAP,
  ARROW_SIZE,
  BASE_GRID,
  MAX_SCALE,
  MIN_SCALE,
  NODE_RADIUS,
  catmullRom,
  circleEdgeWithGap,
  circleIntersectsRect,
  clamp,
  distToSegment,
  lineIntersectsRect,
  midpoint,
  pointInCircle,
  pointInRect,
  selectionBox,
  snapToGrid,
} from "../geometry";

export const MODEL_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#6366f1",
];

export const FIELD_TYPE_OPTIONS = [
  "String",
  "Number",
  "Boolean",
  "Date",
  "ObjectId",
  "Array",
  "Object",
];

const DRAG_THRESHOLD = 4;
const INFO_BOX_HALF_W = 46;
const INFO_BOX_HALF_H = 22;

type CreateState =
  | { type: "none" }
  | { type: "model" }
  | { type: "relation"; step: "source" | "target"; sourceId?: string }
  | { type: "inherit"; step: "child" | "parent"; childId?: string };

type DrawerState =
  | { type: "closed" }
  | {
      type: "model";
      id: string;
      modelId: string;
      name: string;
      description: string;
      color: string;
    }
  | {
      type: "relation";
      id: string;
      fwdName: string;
      fwdMapping: string;
      revName: string;
      revMapping: string;
    };

interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface DesignerController {
  models: Ref<ModelNode[]>;
  relations: Ref<ModelRelation[]>;
  selectedIds: Ref<string[]>;
  drawer: Ref<DrawerState>;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  readOnly: Ref<boolean>;
  error: Ref<string | undefined>;
  createState: Ref<CreateState>;
  viewport: Viewport;
  canvasEl: Ref<HTMLCanvasElement | undefined>;
  wrapperEl: Ref<HTMLDivElement | undefined>;
  readonly modeLabel: Ref<string>;
  readonly createHint: Ref<string>;
  readonly hasSelection: Ref<boolean>;
  readonly visibleDelete: Ref<boolean>;
  load: () => Promise<void>;
  render: () => void;
  toggleMode: () => Promise<void>;
  syncPositions: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  deleteRelation: (id: string) => Promise<void>;
  toggleModelLock: (model: ModelNode) => Promise<void>;
  toggleRelationLock: (relation: ModelRelation) => Promise<void>;
  enterCreateMode: (type: "model" | "relation" | "inherit") => void;
  exitCreateMode: () => void;
  zoomBy: (factor: number) => void;
  resetViewport: () => void;
  saveDrawer: () => Promise<void>;
  closeDrawer: () => void;
  toggleInheritedFields: (model: ModelNode) => Promise<void>;
  addField: (model: ModelNode) => void;
  removeField: (model: ModelNode, fieldId: string) => void;
  updateField: (model: ModelNode, fieldId: string, patch: Partial<ModelField>) => void;
  moveField: (model: ModelNode, fieldId: string, dir: -1 | 1) => void;
  toggleFieldExpand: (fieldId: string) => void;
  setDrawerDraft: (
    patch: Partial<{
      modelId: string;
      name: string;
      description: string;
      color: string;
      fwdName: string;
      fwdMapping: string;
      revName: string;
      revMapping: string;
    }>
  ) => void;
  isFieldExpanded: (fieldId: string) => boolean;
  attachCanvas: (el: HTMLCanvasElement | undefined) => void;
  attachWrapper: (el: HTMLDivElement | undefined) => void;
  onCanvasPointerDown: (event: PointerEvent) => void;
  onCanvasWheel: (event: WheelEvent) => void;
  onCanvasPointerMove: (event: PointerEvent) => void;
}

type Ref<T> = { value: T };

export function useDesigner(option: {
  title?: string;
  api?: ModelDesignerApi;
  bootstrap?: boolean;
} = {}): DesignerController {
  const api = option.api || createHttpModelDesignerApi();

  const models = ref<ModelNode[]>([]) as Ref<ModelNode[]>;
  const relations = ref<ModelRelation[]>([]) as Ref<ModelRelation[]>;
  const selectedIds = ref<string[]>([]) as Ref<string[]>;
  const drawer = ref<DrawerState>({ type: "closed" }) as Ref<DrawerState>;
  const loading = ref(false) as Ref<boolean>;
  const saving = ref(false) as Ref<boolean>;
  const readOnly = ref(false) as Ref<boolean>;
  const error = ref<string | undefined>(undefined) as Ref<string | undefined>;
  const createState = ref<CreateState>({ type: "none" }) as Ref<CreateState>;

  const canvasEl = shallowRef<HTMLCanvasElement>();
  const wrapperEl = shallowRef<HTMLDivElement>();
  const viewport = reactive<Viewport>({ offsetX: 0, offsetY: 0, scale: 1 });

  // 非响应式内部状态
  let canvasWidth = 0;
  let canvasHeight = 0;
  let canvasDpr = 1;
  let canvasReady = false;
  let dirty = true;
  let rafId: number | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let dragCleanup: (() => void) | undefined;
  const expandedFields = new Set<string>();
  const pendingModelPositions = new Map<string, ModelPosition>();

  // 框选状态
  let selectionRect: { x: number; y: number; width: number; height: number } | undefined;
  let pendingSelectedIds: string[] = [];

  const effectiveSelectedIds = computed(() =>
    selectionRect ? pendingSelectedIds : selectedIds.value
  );

  const modeLabel = computed(() => (readOnly.value ? "只读模式" : "编辑模式"));
  const hasSelection = computed(() => selectedIds.value.length > 0);
  const visibleDelete = computed(() => selectedIds.value.length > 0);

  const createHint = computed(() => {
    const s = createState.value;
    if (s.type === "none") return "点击按钮开始创建";
    if (s.type === "model") return "点击画布放置模型";
    if (s.type === "relation") return s.step === "source" ? "点击源模型" : "点击目标模型";
    return s.step === "child" ? "点击子模型" : "点击父模型";
  });

  // ── 生命周期 ─────────────────────────────────────
  onMounted(() => {
    canvasReady = true;
    startRenderLoop();
    if (option.bootstrap === false) {
      loading.value = false;
      return;
    }
    void load();
  });

  onUnmounted(() => {
    if (rafId !== undefined) cancelAnimationFrame(rafId);
    dragCleanup?.();
    resizeObserver?.disconnect();
  });

  function attachCanvas(el: HTMLCanvasElement | undefined): void {
    canvasEl.value = el;
  }
  function attachWrapper(el: HTMLDivElement | undefined): void {
    wrapperEl.value = el;
  }

  watch(canvasEl, () => {
    setupCanvasIfPossible();
  });
  watch(wrapperEl, () => {
    setupCanvasIfPossible();
  });

  function setupCanvasIfPossible(): void {
    const canvas = canvasEl.value;
    const wrapper = wrapperEl.value;
    if (!canvas || !wrapper) return;
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => applyCanvasSize());
    resizeObserver.observe(wrapper);
    applyCanvasSize();
  }

  function applyCanvasSize(): void {
    const canvas = canvasEl.value;
    const wrapper = wrapperEl.value;
    if (!canvas || !wrapper) return;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvasWidth = w;
    canvasHeight = h;
    canvasDpr = dpr;
    dirty = true;
  }

  function startRenderLoop(): void {
    if (rafId !== undefined) return;
    const loop = () => {
      const canvas = canvasEl.value;
      const reset = canvas && (!canvas.style.width || canvas.width === 300);
      if (dirty || reset) {
        dirty = false;
        render();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function invalidate(): void {
    dirty = true;
  }

  // ── 数据加载 ─────────────────────────────────────
  async function load(): Promise<void> {
    loading.value = true;
    error.value = undefined;
    try {
      const data = await api.bootstrap();
      models.value = data.models;
      relations.value = data.relations;
      readOnly.value = Boolean(data.canvas.locked);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "加载模型设计器失败";
    } finally {
      loading.value = false;
      invalidate();
    }
  }

  // ── 坐标转换 ─────────────────────────────────────
  function screenToWorld(sx: number, sy: number): ModelPosition {
    return {
      x: (sx - viewport.offsetX) / viewport.scale,
      y: (sy - viewport.offsetY) / viewport.scale,
    };
  }
  function worldToScreen(wx: number, wy: number): ModelPosition {
    return {
      x: wx * viewport.scale + viewport.offsetX,
      y: wy * viewport.scale + viewport.offsetY,
    };
  }
  function getCanvasPoint(event: { clientX: number; clientY: number }): ModelPosition {
    const canvas = canvasEl.value;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
  }

  // ── 渲染 ─────────────────────────────────────────
  function render(): void {
    const canvas = canvasEl.value;
    if (!canvas || !canvasReady) return;
    if (!canvas.style.width || canvas.width === 300) applyCanvasSize();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvasWidth;
    const h = canvasHeight;

    ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    drawGrid(ctx, w, h);
    drawRelations(ctx);
    drawModels(ctx);

    if (selectionRect) drawSelectionRect(ctx);

    if (createState.value.type !== "none") {
      drawCreationPreview(ctx);
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const { offsetX, offsetY, scale } = viewport;
    const worldLeft = -offsetX / scale;
    const worldTop = -offsetY / scale;
    const worldRight = (w - offsetX) / scale;
    const worldBottom = (h - offsetY) / scale;

    if (BASE_GRID * scale >= 6) {
      ctx.strokeStyle = "#ecf0f6";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      let sx = Math.floor(worldLeft / BASE_GRID) * BASE_GRID;
      for (let x = sx; x <= worldRight; x += BASE_GRID) {
        const px = x * scale + offsetX;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
      }
      let sy = Math.floor(worldTop / BASE_GRID) * BASE_GRID;
      for (let y = sy; y <= worldBottom; y += BASE_GRID) {
        const py = y * scale + offsetY;
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
      }
      ctx.stroke();
    }

    const sec = BASE_GRID * 5;
    ctx.strokeStyle = "#cfd9e7";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    let sx = Math.floor(worldLeft / sec) * sec;
    for (let x = sx; x <= worldRight; x += sec) {
      ctx.moveTo(x * scale + offsetX, 0);
      ctx.lineTo(x * scale + offsetX, h);
    }
    let sy = Math.floor(worldTop / sec) * sec;
    for (let y = sy; y <= worldBottom; y += sec) {
      ctx.moveTo(0, y * scale + offsetY);
      ctx.lineTo(w, y * scale + offsetY);
    }
    ctx.stroke();

    const ter = BASE_GRID * 25;
    ctx.strokeStyle = "#abb9ce";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let sx2 = Math.floor(worldLeft / ter) * ter;
    for (let x = sx2; x <= worldRight; x += ter) {
      ctx.moveTo(x * scale + offsetX, 0);
      ctx.lineTo(x * scale + offsetX, h);
    }
    let sy2 = Math.floor(worldTop / ter) * ter;
    for (let y = sy2; y <= worldBottom; y += ter) {
      ctx.moveTo(0, y * scale + offsetY);
      ctx.lineTo(w, y * scale + offsetY);
    }
    ctx.stroke();
  }

  function drawModels(ctx: CanvasRenderingContext2D): void {
    const r = NODE_RADIUS * viewport.scale;
    for (const model of models.value) {
      const sPos = worldToScreen(model.x, model.y);
      const color = model.color || "#2563eb";
      const isSelected = effectiveSelectedIds.value.includes(model.id);

      if (isSelected) {
        const box = selectionBox(sPos.x, sPos.y, r, 8);
        ctx.strokeStyle = "#94a3b8";
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.setLineDash([]);
        drawLockIcon(ctx, box.x, box.y, Boolean(model.locked));
      }

      ctx.beginPath();
      ctx.arc(sPos.x, sPos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.12);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = color;
      const fontSize = Math.max(10, 14 * viewport.scale);
      ctx.font = `bold ${fontSize}px -apple-system, "PingFang SC", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(model.name, sPos.x, sPos.y);
    }
  }

  function lineInfoPoints(relation: ModelRelation): {
    source: ModelNode;
    target: ModelNode;
    sPos: ModelPosition;
    tPos: ModelPosition;
    infoPos: ModelPosition;
  } | undefined {
    const source = models.value.find((m) => m.id === relation.sourceId);
    const target = models.value.find((m) => m.id === relation.targetId);
    if (!source || !target) return undefined;
    const sPos = worldToScreen(source.x, source.y);
    const tPos = worldToScreen(target.x, target.y);
    const infoPos = relation.position
      ? worldToScreen(relation.position.x, relation.position.y)
      : midpoint(sPos, tPos);
    return { source, target, sPos, tPos, infoPos };
  }

  /** 关系信息框的屏幕矩形（用于命中检测）。 */
  function infoBoxRect(sPos: ModelPosition, tPos: ModelPosition, relation: ModelRelation) {
    const infoPos = relation.position
      ? worldToScreen(relation.position.x, relation.position.y)
      : midpoint(sPos, tPos);
    const w = estimateInfoBoxWidth(relation) * viewport.scale;
    const h = 34 * viewport.scale;
    return { x: infoPos.x - w / 2, y: infoPos.y - h / 2, width: w, height: h, infoPos };
  }

  function estimateInfoBoxWidth(relation: ModelRelation): number {
    const fwd = relation.forward;
    const rev = relation.reverse;
    const fwdText = fwd ? `${fwd.name}·${fwd.mappingType}` : "";
    const revText = rev ? `${rev.name}·${rev.mappingType}` : "";
    const maxLen = Math.max(fwdText.length, revText.length, 4);
    return Math.max(maxLen * 7 + 20, 60);
  }

  function drawRelations(ctx: CanvasRenderingContext2D): void {
    const r = NODE_RADIUS * viewport.scale;
    const gap = ARROW_GAP * viewport.scale;

    for (const relation of relations.value) {
      const pts = lineInfoPoints(relation);
      if (!pts) continue;
      const { sPos, tPos, infoPos } = pts;

      if (relation.relationType === "inherit") {
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
        drawArrowHead(ctx, end.x, end.y, end.angle + Math.PI, "#9ca3af");
        continue;
      }

      const hasCustomPos = !!relation.position;
      const isCurved = hasCustomPos || relation.locked;

      if (isCurved) {
        const fwdStart = circleEdgeWithGap(infoPos.x, infoPos.y, 0, sPos.x, sPos.y, gap);
        const fwdEnd = circleEdgeWithGap(sPos.x, sPos.y, r, infoPos.x, infoPos.y, gap);
        const revStart = circleEdgeWithGap(infoPos.x, infoPos.y, 0, tPos.x, tPos.y, gap);
        const revEnd = circleEdgeWithGap(tPos.x, tPos.y, r, infoPos.x, infoPos.y, gap);
        const c1 = { x: (fwdStart.x + fwdEnd.x) / 2, y: (fwdStart.y + fwdEnd.y) / 2 };
        const c2 = { x: (revStart.x + revEnd.x) / 2, y: (revStart.y + revEnd.y) / 2 };
        ctx.strokeStyle = "#fbcf43";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fwdStart.x, fwdStart.y);
        ctx.quadraticCurveTo(c1.x, c1.y, fwdEnd.x, fwdEnd.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(revStart.x, revStart.y);
        ctx.quadraticCurveTo(c2.x, c2.y, revEnd.x, revEnd.y);
        ctx.stroke();
        drawArrowHead(ctx, fwdEnd.x, fwdEnd.y, Math.atan2(fwdEnd.y - c1.y, fwdEnd.x - c1.x), "#fbcf43");
        drawArrowHead(ctx, revEnd.x, revEnd.y, Math.atan2(revEnd.y - c2.y, revEnd.x - c2.x), "#fbcf43");
      } else {
        const end1 = circleEdgeWithGap(sPos.x, sPos.y, r, infoPos.x, infoPos.y, gap);
        const end2 = circleEdgeWithGap(tPos.x, tPos.y, r, infoPos.x, infoPos.y, gap);
        ctx.strokeStyle = "#fbcf43";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(infoPos.x, infoPos.y);
        ctx.lineTo(end1.x, end1.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(infoPos.x, infoPos.y);
        ctx.lineTo(end2.x, end2.y);
        ctx.stroke();
        drawArrowHead(ctx, end1.x, end1.y, end1.angle + Math.PI, "#fbcf43");
        drawArrowHead(ctx, end2.x, end2.y, end2.angle + Math.PI, "#fbcf43");
      }

      drawInfoBox(ctx, infoPos.x, infoPos.y, relation);
    }
  }

  function drawInfoBox(ctx: CanvasRenderingContext2D, x: number, y: number, relation: ModelRelation): void {
    const fwd = relation.forward;
    const rev = relation.reverse;
    const fwdText = fwd ? `${fwd.name}·${fwd.mappingType}` : "";
    const revText = rev ? `${rev.name}·${rev.mappingType}` : "";
    const boxW = estimateInfoBoxWidth(relation);
    const boxH = 34;
    const boxX = x - boxW / 2;
    const boxY = y - boxH / 2;

    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(boxX, y);
    ctx.lineTo(boxX + boxW, y);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.fillStyle = "#2563eb";
    ctx.fillText(fwdText, x, y - 8);
    ctx.fillStyle = "#16a34a";
    ctx.fillText(revText, x, y + 8);

    if (effectiveSelectedIds.value.includes(relation.id)) {
      drawLockIcon(ctx, boxX, boxY, Boolean(relation.locked));
    }
  }

  function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string): void {
    const size = ARROW_SIZE * viewport.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.5);
    ctx.lineTo(-size, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLockIcon(ctx: CanvasRenderingContext2D, x: number, y: number, locked: boolean): void {
    const w = 14;
    const h = 12;
    ctx.fillStyle = locked ? "#f59e0b" : "#94a3b8";
    ctx.fillRect(x, y + 3, w, h - 3);
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 3, w / 3.5, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 7, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSelectionRect(ctx: CanvasRenderingContext2D): void {
    const rect = selectionRect;
    if (!rect) return;
    const sPos = worldToScreen(rect.x, rect.y);
    const w = rect.width * viewport.scale;
    const h = rect.height * viewport.scale;
    ctx.save();
    ctx.fillStyle = "rgba(37, 99, 235, 0.08)";
    ctx.fillRect(sPos.x, sPos.y, w, h);
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(sPos.x, sPos.y, w, h);
    ctx.restore();
  }

  function drawCreationPreview(ctx: CanvasRenderingContext2D): void {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16) || 37;
    const g = parseInt(hex.slice(3, 5), 16) || 99;
    const b = parseInt(hex.slice(5, 7), 16) || 235;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── 命中检测 ─────────────────────────────────────
  function hitTestModel(wx: number, wy: number): ModelNode | undefined {
    for (let i = models.value.length - 1; i >= 0; i--) {
      const m = models.value[i];
      if (pointInCircle(wx, wy, m.x, m.y, NODE_RADIUS)) return m;
    }
    return undefined;
  }

  function hitTestLockIcon(sx: number, sy: number): { type: "model" | "relation"; id: string } | undefined {
    const r = NODE_RADIUS * viewport.scale;
    const padding = 8;
    const iconW = 14;
    const iconH = 12;

    for (const model of models.value) {
      if (!selectedIds.value.includes(model.id)) continue;
      const sPos = worldToScreen(model.x, model.y);
      const iconX = sPos.x - r - padding;
      const iconY = sPos.y - r - padding;
      if (sx >= iconX && sx <= iconX + iconW && sy >= iconY && sy <= iconY + iconH) {
        return { type: "model", id: model.id };
      }
    }

    for (const relation of relations.value) {
      if (relation.relationType === "inherit") continue;
      if (!selectedIds.value.includes(relation.id)) continue;
      const pts = lineInfoPoints(relation);
      if (!pts) continue;
      const rect = infoBoxRect(pts.sPos, pts.tPos, relation);
      const iconX = rect.x;
      const iconY = rect.y;
      if (sx >= iconX && sx <= iconX + iconW && sy >= iconY && sy <= iconY + iconH) {
        return { type: "relation", id: relation.id };
      }
    }
    return undefined;
  }

  function hitTestInfoBox(wx: number, wy: number): ModelRelation | undefined {
    for (const relation of relations.value) {
      if (relation.relationType === "inherit") continue;
      const pts = lineInfoPoints(relation);
      if (!pts) continue;
      const rect = infoBoxRect(pts.sPos, pts.tPos, relation);
      const worldRect = {
        x: (rect.x - viewport.offsetX) / viewport.scale,
        y: (rect.y - viewport.offsetY) / viewport.scale,
        width: rect.width / viewport.scale,
        height: rect.height / viewport.scale,
      };
      if (pointInRect(wx, wy, worldRect)) return relation;
    }
    return undefined;
  }

  function hitTestRelation(wx: number, wy: number): ModelRelation | undefined {
    const threshold = 8 / viewport.scale;
    for (const relation of relations.value) {
      const pts = lineInfoPoints(relation);
      if (!pts) continue;
      const { source, target } = pts;

      if (relation.relationType === "inherit") {
        if (distToSegment(wx, wy, source.x, source.y, target.x, target.y) <= threshold) {
          return relation;
        }
        continue;
      }

      const infoPos = relation.position ?? midpoint(source, target);
      if (relation.position || relation.locked) {
        if (
          distToSegment(wx, wy, source.x, source.y, infoPos.x, infoPos.y) <= threshold ||
          distToSegment(wx, wy, infoPos.x, infoPos.y, target.x, target.y) <= threshold
        ) {
          return relation;
        }
      } else {
        const mid = midpoint(source, target);
        if (
          distToSegment(wx, wy, source.x, source.y, mid.x, mid.y) <= threshold ||
          distToSegment(wx, wy, mid.x, mid.y, target.x, target.y) <= threshold
        ) {
          return relation;
        }
      }
    }
    return undefined;
  }

  // ── 事件处理（由组件调用，绑定到 canvas）──────────
  function onCanvasPointerDown(event: PointerEvent): void {
    event.preventDefault();
    if (loading.value) return;

    const canvas = canvasEl.value;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const lockHit = hitTestLockIcon(sx, sy);
      if (lockHit) {
        if (lockHit.type === "model") {
          const model = models.value.find((m) => m.id === lockHit.id);
          if (model) void toggleModelLock(model);
        } else {
          const rel = relations.value.find((r) => r.id === lockHit.id);
          if (rel) void toggleRelationLock(rel);
        }
        return;
      }
    }

    const point = getCanvasPoint(event);

    if (createState.value.type !== "none" && !readOnly.value) {
      handleCreateClick(point);
      return;
    }

    const model = hitTestModel(point.x, point.y);
    if (model) {
      if (readOnly.value) {
        selectedIds.value = [model.id];
        openModelDrawer(model);
        invalidate();
        return;
      }
      beginModelDrag(event, model, point);
      return;
    }

    const infoRel = hitTestInfoBox(point.x, point.y);
    if (infoRel) {
      if (readOnly.value) {
        selectedIds.value = [infoRel.id];
        openRelationDrawer(infoRel);
        invalidate();
        return;
      }
      beginInfoBoxDrag(event, infoRel, point);
      return;
    }

    const rel = hitTestRelation(point.x, point.y);
    if (rel) {
      selectedIds.value = [rel.id];
      openRelationDrawer(rel);
      invalidate();
      return;
    }

    if (readOnly.value || event.button !== 0) {
      beginPan(event);
    } else {
      beginBoxSelect(event, point);
    }
  }

  function onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    const canvas = canvasEl.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = clamp(viewport.scale * delta, MIN_SCALE, MAX_SCALE);
    const ratio = newScale / viewport.scale;
    viewport.scale = newScale;
    viewport.offsetX = mx - (mx - viewport.offsetX) * ratio;
    viewport.offsetY = my - (my - viewport.offsetY) * ratio;
    invalidate();
  }

  function onCanvasPointerMove(event: PointerEvent): void {
    // hover 高亮逻辑未来可扩展
    void event;
  }

  // ── 模型拖动 ─────────────────────────────────────
  function beginModelDrag(
    event: PointerEvent,
    model: ModelNode,
    startPoint: ModelPosition
  ): void {
    event.stopPropagation();
    if (!selectedIds.value.includes(model.id)) {
      selectSingle(model.id, event.shiftKey);
    }

    if (model.locked || event.button !== 0) {
      invalidate();
      return;
    }

    const startScreen = { x: event.clientX, y: event.clientY };
    let isDragging = false;
    const selectedSet = new Set(selectedIds.value);
    const origins = new Map<string, ModelPosition>();
    for (const id of selectedSet) {
      const m = models.value.find((item) => item.id === id);
      if (m && !m.locked) origins.set(id, { x: m.x, y: m.y });
    }

    const onMove = (nativeEvent: PointerEvent) => {
      const dx = nativeEvent.clientX - startScreen.x;
      const dy = nativeEvent.clientY - startScreen.y;
      if (!isDragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      isDragging = true;
      const isBoxDrag = selectedSet.size > 1;
      for (const [id, orig] of origins) {
        const m = models.value.find((item) => item.id === id);
        if (!m) continue;
        if (isBoxDrag) {
          m.x = orig.x + dx / viewport.scale;
          m.y = orig.y + dy / viewport.scale;
        } else {
          m.x = snapToGrid(orig.x + dx / viewport.scale, BASE_GRID);
          m.y = snapToGrid(orig.y + dy / viewport.scale, BASE_GRID);
        }
      }
      invalidate();
    };

    const onEnd = async () => {
      dragCleanup?.();
      dragCleanup = undefined;
      if (!isDragging) {
        openModelDrawer(model);
        return;
      }
      for (const id of origins.keys()) {
        const m = models.value.find((item) => item.id === id);
        if (m && !m.locked) {
          m.locked = true;
          await api.updateModel(m.id, { locked: true }).catch(() => {});
        }
      }
      for (const id of selectedIds.value) {
        const rel = relations.value.find((r) => r.id === id);
        if (rel && rel.relationType !== "inherit" && !rel.locked) {
          rel.locked = true;
          await api.updateRelation(rel.id, { locked: true }).catch(() => {});
        }
      }
      invalidate();
      for (const [id] of origins) {
        const m = models.value.find((item) => item.id === id);
        if (m) await commitModelPosition(m);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    dragCleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }

  async function commitModelPosition(model: ModelNode): Promise<void> {
    try {
      await api.updateModelPosition(model.id, { x: model.x, y: model.y });
      pendingModelPositions.delete(model.id);
    } catch (e) {
      pendingModelPositions.set(model.id, { x: model.x, y: model.y });
      error.value = e instanceof Error ? e.message : "提交模型位置失败";
    }
  }

  // ── 信息框拖动 ───────────────────────────────────
  function beginInfoBoxDrag(
    event: PointerEvent,
    relation: ModelRelation,
    startPoint: ModelPosition
  ): void {
    event.stopPropagation();
    selectSingle(relation.id, false);

    if (relation.locked || event.button !== 0) {
      invalidate();
      return;
    }

    const startScreen = { x: event.clientX, y: event.clientY };
    const source = models.value.find((m) => m.id === relation.sourceId);
    const target = models.value.find((m) => m.id === relation.targetId);
    const origin = relation.position ?? (source && target ? midpoint(source, target) : startPoint);

    const onMove = (nativeEvent: PointerEvent) => {
      const dx = (nativeEvent.clientX - startScreen.x) / viewport.scale;
      const dy = (nativeEvent.clientY - startScreen.y) / viewport.scale;
      relation.position = { x: origin.x + dx, y: origin.y + dy };
      invalidate();
    };

    const onEnd = () => {
      dragCleanup?.();
      dragCleanup = undefined;
      relation.locked = true;
      invalidate();
      void commitRelationPosition(relation);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    dragCleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }

  async function commitRelationPosition(relation: ModelRelation): Promise<void> {
    try {
      await api.updateRelation(relation.id, { position: relation.position });
    } catch (e) {
      error.value = e instanceof Error ? e.message : "提交关系位置失败";
    }
  }

  // ── 框选 ─────────────────────────────────────────
  function beginBoxSelect(event: PointerEvent, startPoint: ModelPosition): void {
    drawer.value = { type: "closed" };
    selectedIds.value = [];
    pendingSelectedIds = [];

    const startScreen = { x: event.clientX, y: event.clientY };

    const onMove = (nativeEvent: PointerEvent) => {
      const cur = getCanvasPoint(nativeEvent);
      selectionRect = {
        x: Math.min(startPoint.x, cur.x),
        y: Math.min(startPoint.y, cur.y),
        width: Math.abs(cur.x - startPoint.x),
        height: Math.abs(cur.y - startPoint.y),
      };
      const ids: string[] = [];
      for (const model of models.value) {
        if (circleIntersectsRect(model.x, model.y, NODE_RADIUS, selectionRect!)) {
          ids.push(model.id);
        }
      }
      for (const relation of relations.value) {
        if (relation.relationType === "inherit") continue;
        const pts = lineInfoPoints(relation);
        if (!pts) continue;
        const { source, target } = pts;
        const infoPos = relation.position ?? midpoint(source, target);
        if (
          lineIntersectsRect(infoPos.x, infoPos.y, source.x, source.y, selectionRect!) ||
          lineIntersectsRect(infoPos.x, infoPos.y, target.x, target.y, selectionRect!)
        ) {
          ids.push(relation.id);
        }
      }
      pendingSelectedIds = ids;
      invalidate();
    };

    const onEnd = () => {
      dragCleanup?.();
      dragCleanup = undefined;
      selectionRect = undefined;
      selectedIds.value = pendingSelectedIds;
      pendingSelectedIds = [];
      invalidate();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    dragCleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }

  // ── 平移 ─────────────────────────────────────────
  function beginPan(event: PointerEvent): void {
    const startScreen = { x: event.clientX, y: event.clientY };
    const origin = { ...viewport };

    const onMove = (nativeEvent: PointerEvent) => {
      viewport.offsetX = origin.offsetX + (nativeEvent.clientX - startScreen.x);
      viewport.offsetY = origin.offsetY + (nativeEvent.clientY - startScreen.y);
      invalidate();
    };

    const onEnd = () => {
      dragCleanup?.();
      dragCleanup = undefined;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    dragCleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }

  // ── 缩放控制 ─────────────────────────────────────
  function zoomBy(factor: number): void {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const newScale = clamp(viewport.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio = newScale / viewport.scale;
    viewport.scale = newScale;
    viewport.offsetX = cx - (cx - viewport.offsetX) * ratio;
    viewport.offsetY = cy - (cy - viewport.offsetY) * ratio;
    invalidate();
  }

  function resetViewport(): void {
    viewport.offsetX = 0;
    viewport.offsetY = 0;
    viewport.scale = 1;
    invalidate();
  }

  // ── 创建模式 ─────────────────────────────────────
  function enterCreateMode(type: "model" | "relation" | "inherit"): void {
    if (readOnly.value) return;
    if (type === "model") {
      createState.value = { type: "model" };
    } else if (type === "relation") {
      createState.value = { type: "relation", step: "source" };
    } else {
      createState.value = { type: "inherit", step: "child" };
    }
    drawer.value = { type: "closed" };
    selectedIds.value = [];
    invalidate();
  }

  function exitCreateMode(): void {
    createState.value = { type: "none" };
    invalidate();
  }

  function handleCreateClick(point: ModelPosition): void {
    const s = createState.value;
    if (s.type === "model") {
      const x = snapToGrid(point.x, BASE_GRID);
      const y = snapToGrid(point.y, BASE_GRID);
      void createModelAt(x, y);
      exitCreateMode();
      return;
    }

    if (s.type === "relation") {
      const model = hitTestModel(point.x, point.y);
      if (!model) {
        exitCreateMode();
        return;
      }
      if (s.step === "source") {
        createState.value = { type: "relation", step: "target", sourceId: model.id };
        selectedIds.value = [model.id];
        invalidate();
      } else if (s.sourceId) {
        void createRelationBetween(s.sourceId, model.id);
        exitCreateMode();
      }
      return;
    }

    if (s.type === "inherit") {
      const model = hitTestModel(point.x, point.y);
      if (!model) {
        exitCreateMode();
        return;
      }
      if (s.step === "child") {
        createState.value = { type: "inherit", step: "parent", childId: model.id };
        selectedIds.value = [model.id];
        invalidate();
      } else if (s.childId) {
        void createInheritanceBetween(s.childId, model.id);
        exitCreateMode();
      }
      return;
    }
  }

  // ── CRUD ─────────────────────────────────────────
  async function createModelAt(x: number, y: number): Promise<void> {
    saving.value = true;
    error.value = undefined;
    try {
      const colorIdx = models.value.length % MODEL_COLORS.length;
      const model = await api.createModel({
        name: `模型${models.value.length + 1}`,
        description: "",
        color: MODEL_COLORS[colorIdx],
        x,
        y,
        fields: [],
      });
      models.value = [...models.value, model];
      openModelDrawer(model);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "创建模型失败";
    } finally {
      saving.value = false;
      invalidate();
    }
  }

  async function createRelationBetween(sourceId: string, targetId: string): Promise<void> {
    saving.value = true;
    error.value = undefined;
    try {
      const source = models.value.find((m) => m.id === sourceId);
      const target = models.value.find((m) => m.id === targetId);
      const fwdName = target?.id ?? "";
      const revName = source?.id ?? "";
      const relation = await api.createRelation({
        sourceId,
        targetId,
        relationType: "relation",
        forward: { name: fwdName, source: sourceId, target: targetId, mappingType: "1" },
        reverse: { name: revName, source: targetId, target: sourceId, mappingType: "m" },
      });
      relations.value = [...relations.value, relation];
      openRelationDrawer(relation);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "创建关系失败";
    } finally {
      saving.value = false;
      invalidate();
    }
  }

  async function createInheritanceBetween(childId: string, parentId: string): Promise<void> {
    if (isDescendant(parentId, childId)) {
      error.value = "创建继承关系失败：目标父模型是子模型的后代，将形成继承环";
      invalidate();
      return;
    }
    if (childId === parentId) {
      error.value = "创建继承关系失败：不能继承自身";
      invalidate();
      return;
    }
    saving.value = true;
    error.value = undefined;
    try {
      const relation = await api.createRelation({
        sourceId: childId,
        targetId: parentId,
        relationType: "inherit",
      });
      relations.value = [...relations.value, relation];
      const child = models.value.find((m) => m.id === childId);
      if (child) child.parentModelId = parentId;
      const parent = models.value.find((m) => m.id === parentId);
      if (parent) parent.childModelIds = [...(parent.childModelIds ?? []), childId];
    } catch (e) {
      error.value = e instanceof Error ? e.message : "创建继承关系失败";
    } finally {
      saving.value = false;
      invalidate();
    }
  }

  function isDescendant(rootId: string, targetId: string): boolean {
    const visited = new Set<string>();
    const stack = [rootId];
    while (stack.length > 0) {
      const curId = stack.pop()!;
      if (visited.has(curId)) continue;
      visited.add(curId);
      const model = models.value.find((m) => m.id === curId);
      if (!model?.childModelIds) continue;
      for (const childId of model.childModelIds) {
        if (childId === targetId) return true;
        stack.push(childId);
      }
    }
    return false;
  }

  // ── 选择 ─────────────────────────────────────────
  function selectSingle(id: string, additive: boolean): void {
    if (additive) {
      selectedIds.value = selectedIds.value.includes(id)
        ? selectedIds.value.filter((item) => item !== id)
        : [...selectedIds.value, id];
    } else {
      selectedIds.value = [id];
    }
  }

  // ── 删除 ─────────────────────────────────────────
  async function deleteSelected(): Promise<void> {
    if (!selectedIds.value.length || readOnly.value) return;

    const modelIds = selectedIds.value.filter((id) => models.value.some((m) => m.id === id));
    const relationIds = selectedIds.value.filter((id) => relations.value.some((r) => r.id === id));
    const selectedSet = new Set(selectedIds.value);

    for (const mid of modelIds) {
      const model = models.value.find((m) => m.id === mid);
      if (!model?.childModelIds) continue;
      for (const childId of model.childModelIds) {
        if (!selectedSet.has(childId)) {
          const child = models.value.find((m) => m.id === childId);
          error.value = `无法删除模型「${model.name}」：存在未被选中的子模型「${child?.name ?? childId}」，请先选中子模型`;
          invalidate();
          return;
        }
      }
    }

    saving.value = true;
    error.value = undefined;
    try {
      const relationsToDelete = relationIds.filter((rid) => {
        const rel = relations.value.find((r) => r.id === rid);
        if (!rel) return false;
        if (modelIds.includes(rel.sourceId) || modelIds.includes(rel.targetId)) return false;
        return true;
      });

      for (const rid of relationsToDelete) {
        await api.deleteRelation(rid);
      }
      relations.value = relations.value.filter((r) => !relationsToDelete.includes(r.id));

      const deleteOrder = sortForDeletion(modelIds);
      for (const mid of deleteOrder) {
        await api.deleteModel(mid);
        relations.value = relations.value.filter((r) => r.sourceId !== mid && r.targetId !== mid);
      }
      models.value = models.value.filter((m) => !modelIds.includes(m.id));

      for (const model of models.value) {
        if (model.childModelIds) {
          model.childModelIds = model.childModelIds.filter((id) => !modelIds.includes(id));
        }
        if (model.parentModelId && modelIds.includes(model.parentModelId)) {
          model.parentModelId = null;
        }
      }

      selectedIds.value = [];
      drawer.value = { type: "closed" };
    } catch (e) {
      error.value = e instanceof Error ? e.message : "删除失败";
      await load();
    } finally {
      saving.value = false;
      invalidate();
    }
  }

  function sortForDeletion(modelIds: string[]): string[] {
    const idSet = new Set(modelIds);
    const visited = new Set<string>();
    const result: string[] = [];
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const model = models.value.find((m) => m.id === id);
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

  async function deleteRelation(id: string): Promise<void> {
    const relation = relations.value.find((r) => r.id === id);
    if (!relation || readOnly.value) return;
    saving.value = true;
    try {
      await api.deleteRelation(id);
      relations.value = relations.value.filter((r) => r.id !== id);
      if (relation.relationType === "inherit") {
        const child = models.value.find((m) => m.id === relation.sourceId);
        const parent = models.value.find((m) => m.id === relation.targetId);
        if (child) child.parentModelId = null;
        if (parent?.childModelIds) {
          parent.childModelIds = parent.childModelIds.filter((cid) => cid !== relation.sourceId);
        }
      }
      drawer.value = { type: "closed" };
      selectedIds.value = selectedIds.value.filter((sid) => sid !== id);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "删除关系失败";
    } finally {
      saving.value = false;
      invalidate();
    }
  }

  // ── 模式切换 ─────────────────────────────────────
  async function toggleMode(): Promise<void> {
    const prev = readOnly.value;
    readOnly.value = !prev;
    createState.value = { type: "none" };
    try {
      await api.setLocked(readOnly.value);
    } catch (e) {
      readOnly.value = prev;
      error.value = e instanceof Error ? e.message : "更新模式失败";
    }
    invalidate();
  }

  // ── 同步位置 ─────────────────────────────────────
  async function syncPositions(): Promise<void> {
    if (readOnly.value) return;
    saving.value = true;
    error.value = undefined;
    try {
      for (const model of models.value) {
        await api.updateModelPosition(model.id, { x: model.x, y: model.y });
      }
      for (const relation of relations.value) {
        if (relation.position) {
          await api.updateRelation(relation.id, { position: relation.position });
        }
      }
      pendingModelPositions.clear();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "同步位置失败";
    } finally {
      saving.value = false;
    }
  }

  // ── 锁定 ─────────────────────────────────────────
  async function toggleModelLock(model: ModelNode): Promise<void> {
    if (readOnly.value) return;
    const prev = Boolean(model.locked);
    model.locked = !prev;
    invalidate();
    try {
      await api.updateModel(model.id, { locked: model.locked });
    } catch (e) {
      model.locked = prev;
      error.value = e instanceof Error ? e.message : "更新锁定状态失败";
      invalidate();
    }
  }

  async function toggleRelationLock(relation: ModelRelation): Promise<void> {
    if (readOnly.value) return;
    const prev = Boolean(relation.locked);
    relation.locked = !prev;
    if (!relation.locked) {
      relation.position = undefined;
    }
    invalidate();
    try {
      await api.updateRelation(relation.id, {
        locked: relation.locked,
        position: relation.position,
      });
    } catch (e) {
      relation.locked = prev;
      error.value = e instanceof Error ? e.message : "更新关系锁定状态失败";
      invalidate();
    }
  }

  // ── 抽屉 ─────────────────────────────────────────
  function openModelDrawer(model: ModelNode): void {
    drawer.value = {
      type: "model",
      id: model.id,
      modelId: model.id,
      name: model.name,
      description: model.description || "",
      color: model.color || "#2563eb",
    };
  }

  function openRelationDrawer(relation: ModelRelation): void {
    drawer.value = {
      type: "relation",
      id: relation.id,
      fwdName: relation.forward?.name ?? "",
      fwdMapping: relation.forward?.mappingType ?? "1",
      revName: relation.reverse?.name ?? "",
      revMapping: relation.reverse?.mappingType ?? "m",
    };
  }

  function closeDrawer(): void {
    drawer.value = { type: "closed" };
  }

  function setDrawerDraft(
    patch: Partial<{
      modelId: string;
      name: string;
      description: string;
      color: string;
      fwdName: string;
      fwdMapping: string;
      revName: string;
      revMapping: string;
    }>
  ): void {
    const d = drawer.value;
    if (d.type === "closed") return;
    drawer.value = { ...d, ...patch } as DrawerState;
  }

  async function saveDrawer(): Promise<void> {
    const d = drawer.value;
    if (d.type === "model") {
      const model = models.value.find((m) => m.id === d.id);
      if (!model || readOnly.value) return;
      const patch: ModelPatch = {
        name: d.name.trim(),
        description: d.description.trim(),
        color: d.color,
      };
      const prev = { name: model.name, description: model.description, color: model.color };
      Object.assign(model, patch);
      saving.value = true;
      invalidate();
      try {
        await api.updateModel(model.id, patch);
      } catch (e) {
        Object.assign(model, prev);
        error.value = e instanceof Error ? e.message : "保存模型失败";
      } finally {
        saving.value = false;
        invalidate();
      }
    } else if (d.type === "relation") {
      const relation = relations.value.find((r) => r.id === d.id);
      if (!relation || readOnly.value) return;
      const prevFwd = relation.forward ? { ...relation.forward } : undefined;
      const prevRev = relation.reverse ? { ...relation.reverse } : undefined;
      if (relation.forward) {
        relation.forward.name = d.fwdName;
        relation.forward.mappingType = d.fwdMapping as "1" | "m" | "n";
      }
      if (relation.reverse) {
        relation.reverse.name = d.revName;
        relation.reverse.mappingType = d.revMapping as "1" | "m" | "n";
      }
      saving.value = true;
      invalidate();
      try {
        await api.updateRelation(relation.id, {
          forward: relation.forward,
          reverse: relation.reverse,
        });
      } catch (e) {
        if (relation.forward && prevFwd) relation.forward = prevFwd;
        if (relation.reverse && prevRev) relation.reverse = prevRev;
        error.value = e instanceof Error ? e.message : "保存关系失败";
      } finally {
        saving.value = false;
        invalidate();
      }
    }
  }

  // ── 字段管理 ─────────────────────────────────────
  async function toggleInheritedFields(model: ModelNode): Promise<void> {
    if (readOnly.value) return;
    const prev = model.showInheritedFields;
    model.showInheritedFields = prev === false;
    invalidate();
    try {
      await api.updateModel(model.id, { showInheritedFields: model.showInheritedFields });
    } catch (e) {
      model.showInheritedFields = prev;
      error.value = e instanceof Error ? e.message : "更新继承字段显隐失败";
      invalidate();
    }
  }

  function addField(model: ModelNode): void {
    if (readOnly.value || model.locked) return;
    const newField: ModelField = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: "新字段",
      type: "String",
      description: "",
    };
    model.fields = [...(model.fields ?? []).filter((f) => !f.inherited), newField];
    expandedFields.add(newField.id);
    invalidate();
    void api
      .updateModel(model.id, { fields: model.fields })
      .catch((e) => (error.value = e instanceof Error ? e.message : "添加字段失败"));
  }

  function removeField(model: ModelNode, fieldId: string): void {
    if (readOnly.value || model.locked) return;
    model.fields = (model.fields ?? []).filter((f) => f.id !== fieldId || f.inherited);
    expandedFields.delete(fieldId);
    invalidate();
    void api
      .updateModel(model.id, { fields: model.fields })
      .catch((e) => (error.value = e instanceof Error ? e.message : "删除字段失败"));
  }

  function updateField(model: ModelNode, fieldId: string, patch: Partial<ModelField>): void {
    if (readOnly.value || model.locked) return;
    const field = (model.fields ?? []).find((f) => f.id === fieldId);
    if (!field || field.inherited) return;
    Object.assign(field, patch);
    invalidate();
    void api
      .updateModel(model.id, { fields: model.fields })
      .catch((e) => (error.value = e instanceof Error ? e.message : "更新字段失败"));
  }

  function moveField(model: ModelNode, fieldId: string, dir: -1 | 1): void {
    if (readOnly.value || model.locked) return;
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
    invalidate();
    void api
      .updateModel(model.id, { fields: model.fields })
      .catch((e) => (error.value = e instanceof Error ? e.message : "排序字段失败"));
  }

  function toggleFieldExpand(fieldId: string): void {
    if (expandedFields.has(fieldId)) {
      expandedFields.delete(fieldId);
    } else {
      expandedFields.add(fieldId);
    }
    invalidate();
  }

  function isFieldExpanded(fieldId: string): boolean {
    return expandedFields.has(fieldId);
  }

  return reactive({
    models,
    relations,
    selectedIds,
    drawer,
    loading,
    saving,
    readOnly,
    error,
    createState,
    viewport,
    canvasEl,
    wrapperEl,
    modeLabel,
    createHint,
    hasSelection,
    visibleDelete,
    load,
    render,
    toggleMode,
    syncPositions,
    deleteSelected,
    deleteRelation,
    toggleModelLock,
    toggleRelationLock,
    enterCreateMode,
    exitCreateMode,
    zoomBy,
    resetViewport,
    saveDrawer,
    closeDrawer,
    toggleInheritedFields,
    addField,
    removeField,
    updateField,
    moveField,
    toggleFieldExpand,
    setDrawerDraft,
    isFieldExpanded,
    attachCanvas,
    attachWrapper,
    onCanvasPointerDown,
    onCanvasWheel,
    onCanvasPointerMove,
  }) as unknown as DesignerController;
}
