<script setup vapor lang="ts">
import type { DesignerController } from "../composer/useDesigner";

const props = defineProps<{
  designer: DesignerController;
}>();

const d = props.designer;

function onCanvasRef(el: HTMLCanvasElement | null): void {
  d.attachCanvas(el ?? undefined);
}
function onWrapperRef(el: HTMLDivElement | null): void {
  d.attachWrapper(el ?? undefined);
}
</script>

<template>
  <div class="md-stage">
    <div class="md-stage__canvas-wrapper" :ref="onWrapperRef">
      <canvas
        class="md-stage__canvas"
        :ref="onCanvasRef"
        :class="{
          'is-creating': d.createState.type !== 'none',
          'is-locked': d.readOnly,
        }"
        @pointerdown="d.onCanvasPointerDown"
        @pointermove="d.onCanvasPointerMove"
        @wheel="d.onCanvasWheel"
        @contextmenu.prevent
      />

      <!-- 创建提示 -->
      <div v-if="d.createState.type !== 'none'" class="md-stage__hint">
        {{ d.createHint }}
      </div>

      <!-- 左上角：第一种按钮（创建类，带激活状态） -->
      <div class="md-stage__create">
        <button
          class="icon-btn icon-btn--toggle"
          :class="d.createState.type === 'model' ? 'icon-btn--active' : ''"
          :disabled="d.readOnly"
          title="创建模型"
          @click="d.createState.type === 'model' ? d.exitCreateMode() : d.enterCreateMode('model')"
        >
          <svg viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>
        <button
          class="icon-btn icon-btn--toggle"
          :class="d.createState.type === 'relation' ? 'icon-btn--active' : ''"
          :disabled="d.readOnly"
          title="创建关系"
          @click="d.createState.type === 'relation' ? d.exitCreateMode() : d.enterCreateMode('relation')"
        >
          <svg viewBox="0 0 24 24">
            <path d="M9 12h6" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="12" r="3" />
          </svg>
        </button>
        <button
          class="icon-btn icon-btn--toggle"
          :class="d.createState.type === 'inherit' ? 'icon-btn--active' : ''"
          :disabled="d.readOnly"
          title="继承关系"
          @click="d.createState.type === 'inherit' ? d.exitCreateMode() : d.enterCreateMode('inherit')"
        >
          <svg viewBox="0 0 24 24">
            <rect x="9" y="3" width="6" height="6" rx="1" />
            <rect x="3" y="15" width="6" height="6" rx="1" />
            <rect x="15" y="15" width="6" height="6" rx="1" />
            <path d="M12 9v3M12 12h-6v3M12 12h6v3" />
          </svg>
        </button>
      </div>

      <!-- 右上角：第二种按钮（功能类） -->
      <div class="md-stage__actions">
        <button
          class="icon-btn icon-btn--toggle"
          :class="!d.readOnly ? 'icon-btn--active' : ''"
          :title="d.readOnly ? '编辑' : '保存'"
          @click="d.toggleMode"
        >
          <!-- 只读时显示编辑图标，编辑时显示保存图标 -->
          <svg v-if="d.readOnly" viewBox="0 0 24 24">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
        <button
          class="icon-btn"
          :disabled="d.readOnly || d.saving"
          title="同步位置"
          @click="d.syncPositions"
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 3v12" />
            <path d="M8 7l4-4 4 4" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </button>
        <button
          v-if="d.selectedIds.length > 0"
          class="icon-btn"
          :disabled="d.readOnly || d.saving"
          :title="`删除 (${d.selectedIds.length})`"
          @click="d.deleteSelected"
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>

      <!-- 右下角：第二种按钮（缩放类） -->
      <div class="md-stage__zoom">
        <button class="icon-btn" title="放大" @click="d.zoomBy(1.1)">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <line x1="16" y1="16" x2="21" y2="21" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button class="icon-btn" title="缩小" @click="d.zoomBy(0.9)">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <line x1="16" y1="16" x2="21" y2="21" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button class="icon-btn" title="还原" @click="d.resetViewport">
          <svg viewBox="0 0 24 24">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      <div v-if="d.loading" class="md-stage__empty">正在加载模型数据…</div>
      <div v-else-if="!d.models.length" class="md-stage__empty">画布为空，请创建第一个模型</div>
    </div>
  </div>
</template>

<style scoped>
.md-stage {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.md-stage__canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.md-stage__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;
  background: #fbfcfe;
  touch-action: none;
}
.md-stage__canvas.is-creating {
  cursor: crosshair;
}
.md-stage__canvas.is-locked {
  cursor: default;
}
.md-stage__hint {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--md-primary);
  border-radius: 999px;
  font-size: 12px;
  pointer-events: none;
  border: 1px solid #bfdbfe;
}
.md-stage__create {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 5;
}
.md-stage__actions {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  gap: 10px;
  z-index: 5;
}
.md-stage__zoom {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  gap: 10px;
  z-index: 5;
}
.md-stage__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--md-ink-3);
  font-size: 13px;
  pointer-events: none;
}
</style>
