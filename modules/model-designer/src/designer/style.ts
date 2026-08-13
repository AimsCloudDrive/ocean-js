const STYLE_ID = "msom-model-designer-style";

export function ensureModelDesignerStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.model-designer {
  --md-primary: #2563eb;
  --md-primary-weak: #eff6ff;
  --md-ink: #1f2937;
  --md-ink-2: #4b5563;
  --md-ink-3: #9ca3af;
  --md-line: #e5e7eb;
  --md-bg: #f6f7fb;
  --md-card: #ffffff;
  --md-danger: #dc2626;
  --md-ok: #16a34a;
  --md-warn: #f59e0b;
  --md-radius: 10px;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 560px;
  color: var(--md-ink);
  background: var(--md-bg);
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
}
.model-designer * { box-sizing: border-box; }

/* ── 左上角工具区 ─────────────────────────────── */
.model-designer__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: 8px 12px;
  background: var(--md-card);
  border-bottom: 1px solid var(--md-line);
  z-index: 5;
}
.model-designer__toolbar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--md-ink);
  white-space: nowrap;
  margin-right: 8px;
}
.model-designer__toolbar-stats {
  font-size: 12px;
  color: var(--md-ink-3);
  white-space: nowrap;
  margin-right: auto;
}

/* ── 按钮 ─────────────────────────────────────── */
.model-designer button {
  font: inherit;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--md-primary);
  border-radius: 7px;
  color: #fff;
  background: var(--md-primary);
  cursor: pointer;
  transition: opacity .15s;
  white-space: nowrap;
}
.model-designer button:hover { opacity: .88; }
.model-designer button:disabled {
  border-color: var(--md-line);
  color: var(--md-ink-3);
  background: #f3f4f6;
  cursor: not-allowed;
  opacity: 1;
}
.model-designer button.md-btn--secondary {
  border-color: var(--md-line);
  color: var(--md-ink);
  background: #fff;
}
.model-designer button.md-btn--danger {
  border-color: var(--md-danger);
  color: var(--md-danger);
  background: #fee2e2;
}
.model-designer button.md-btn--ghost {
  border-color: var(--md-line);
  color: var(--md-ink-2);
  background: #f3f4f6;
}
.model-designer button.md-btn--active {
  border-color: var(--md-primary);
  color: #fff;
  background: var(--md-primary);
}
.model-designer button.md-btn--sm {
  min-height: 28px;
  padding: 0 8px;
  font-size: 12px;
}

/* ── 主区域 ───────────────────────────────────── */
.model-designer__main {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── 左侧创建区 ───────────────────────────────── */
.model-designer__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 8px;
  width: 92px;
  flex-shrink: 0;
  background: var(--md-card);
  border-right: 1px solid var(--md-line);
}
.model-designer__panel button {
  width: 100%;
  text-align: center;
  font-size: 12px;
  line-height: 1.4;
}
.model-designer__panel-hint {
  margin-top: auto;
  padding: 8px 4px;
  font-size: 11px;
  color: var(--md-ink-3);
  text-align: center;
  line-height: 1.5;
}

/* ── 画布区 ───────────────────────────────────── */
.model-designer__canvas-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #fbfcfe;
}
.model-designer__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: default;
}
.model-designer__canvas.is-creating { cursor: crosshair; }
.model-designer__canvas.is-panning { cursor: grabbing; }
.model-designer__canvas.is-locked { cursor: default; }

.model-designer__canvas-hint {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(37, 99, 235, .9);
  color: #fff;
  font-size: 12px;
  pointer-events: none;
  z-index: 4;
  animation: md-fade-in .2s ease;
}
.model-designer__canvas-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 4;
}
.model-designer__canvas-overlay button {
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.model-designer__canvas-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--md-ink-3);
  pointer-events: none;
  font-size: 14px;
}

/* ── 错误提示 ─────────────────────────────────── */
.model-designer__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  color: #991b1b;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  font-size: 13px;
}
.model-designer__error button {
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border: none;
  color: inherit;
  background: transparent;
  font-size: 18px;
}

/* ── 右侧抽屉 ─────────────────────────────────── */
.model-designer__drawer {
  display: flex;
  flex-direction: column;
  width: 320px;
  flex-shrink: 0;
  background: var(--md-card);
  border-left: 1px solid var(--md-line);
  box-shadow: -4px 0 12px rgba(15, 23, 42, .06);
  animation: md-slide-in .2s ease;
}
.model-designer__drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--md-line);
}
.model-designer__drawer-header strong {
  font-size: 14px;
  color: var(--md-ink);
}
.model-designer__drawer-header button {
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border: none;
  color: var(--md-ink-3);
  background: transparent;
  font-size: 20px;
}
.model-designer__drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.model-designer__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.model-designer__field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--md-ink-2);
}
.model-designer__field input,
.model-designer__field textarea,
.model-designer__field select {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 7px 10px;
  font: inherit;
  color: var(--md-ink);
  background: #fff;
}
.model-designer__field input:disabled,
.model-designer__field textarea:disabled,
.model-designer__field select:disabled {
  background: #f3f4f6;
  color: var(--md-ink-3);
}
.model-designer__field textarea {
  min-height: 64px;
  resize: vertical;
}

/* ── 字段列表 ─────────────────────────────────── */
.model-designer__field-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.model-designer__field-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--md-ink-2);
}
.model-designer__field-toggle {
  font-size: 11px;
  color: var(--md-primary);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  min-height: auto;
}
.model-designer__field-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.model-designer__field-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--md-line);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
}
.model-designer__field-item.is-inherited {
  background: var(--md-primary-weak);
  border-color: #bfdbfe;
}
.model-designer__field-item .field-name {
  flex: 1;
  font-weight: 500;
  color: var(--md-ink);
}
.model-designer__field-item .field-name-input {
  flex: 1;
  min-width: 60px;
  border: 1px solid var(--md-line);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--md-ink);
  background: #fff;
  min-height: auto;
}
.model-designer__field-item .field-name-input:focus {
  border-color: var(--md-primary);
  outline: none;
}
.model-designer__field-item .field-type {
  color: var(--md-ink-3);
  font-size: 11px;
}
.model-designer__field-item .field-type-select {
  border: 1px solid var(--md-line);
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 11px;
  color: var(--md-ink-3);
  background: #fff;
  min-height: auto;
  cursor: pointer;
}
.model-designer__field-item .field-desc {
  display: none;
  width: 100%;
  padding: 4px 0 0;
  font-size: 11px;
  color: var(--md-ink-3);
}
.model-designer__field-item.is-expanded .field-desc {
  display: block;
}
.model-designer__field-item .field-desc-input {
  width: 100%;
  border: 1px solid var(--md-line);
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 11px;
  color: var(--md-ink-2);
  background: #fff;
  resize: vertical;
  min-height: 40px;
}
.model-designer__field-item .field-desc-input:focus {
  border-color: var(--md-primary);
  outline: none;
}
.model-designer__field-collapse {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--md-ink-3);
  min-height: auto;
  padding: 0;
}
.model-designer__field-actions {
  display: flex;
  gap: 4px;
}
.model-designer__field-actions button {
  min-height: 24px;
  min-width: 24px;
  padding: 0 6px;
  font-size: 11px;
  border-radius: 4px;
}

/* ── 颜色选择 ─────────────────────────────────── */
.model-designer__color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.model-designer__color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  min-height: auto;
}
.model-designer__color-swatch.is-active {
  border-color: var(--md-ink);
}

/* ── 关系方向编辑 ──────────────────────────────── */
.model-designer__direction {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--md-line);
  border-radius: 8px;
  background: #fafbfd;
}
.model-designer__direction-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--md-primary);
}
.model-designer__mapping-row {
  display: flex;
  gap: 4px;
}
.model-designer__mapping-row button {
  flex: 1;
  min-height: 28px;
  font-size: 12px;
  border-radius: 5px;
}

/* ── 抽屉底部 ─────────────────────────────────── */
.model-designer__drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--md-line);
}

/* ── 动画 ─────────────────────────────────────── */
@keyframes md-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes md-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ── 响应式 ───────────────────────────────────── */
@media (max-width: 760px) {
  .model-designer__panel { width: 72px; }
  .model-designer__panel button { font-size: 11px; }
  .model-designer__drawer { position: absolute; right: 0; height: 100%; width: min(320px, 88vw); z-index: 10; }
  .model-designer__main { position: relative; }
  .model-designer__toolbar-stats { display: none; }
}
`;
  document.head.appendChild(style);
}
