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
      <div v-if="d.createState.type !== 'none'" class="md-stage__hint">
        {{ d.createHint }}
      </div>
      <div class="md-stage__side">
        <button
          class="md-btn md-btn--sm"
          :class="d.createState.type === 'model' ? 'md-btn--active' : ''"
          :disabled="d.readOnly"
          @click="
            d.createState.type === 'model' ? d.exitCreateMode() : d.enterCreateMode('model')
          "
        >
          创建模型
        </button>
        <button
          class="md-btn md-btn--sm"
          :class="d.createState.type === 'relation' ? 'md-btn--active' : ''"
          :disabled="d.readOnly"
          @click="
            d.createState.type === 'relation' ? d.exitCreateMode() : d.enterCreateMode('relation')
          "
        >
          创建关系
        </button>
        <button
          class="md-btn md-btn--sm"
          :class="d.createState.type === 'inherit' ? 'md-btn--active' : ''"
          :disabled="d.readOnly"
          @click="
            d.createState.type === 'inherit' ? d.exitCreateMode() : d.enterCreateMode('inherit')
          "
        >
          继承关系
        </button>
      </div>
      <div class="md-stage__zoom">
        <button class="md-btn md-btn--ghost md-btn--sm" @click="d.zoomBy(1.1)">+</button>
        <button class="md-btn md-btn--ghost md-btn--sm" @click="d.zoomBy(0.9)">−</button>
        <button class="md-btn md-btn--ghost md-btn--sm" @click="d.resetViewport">⟲</button>
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
.md-stage__side {
  position: absolute;
  top: 14px;
  left: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 86px;
  z-index: 5;
}
.md-stage__side .md-btn {
  width: 100%;
}
.md-stage__zoom {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  gap: 4px;
  padding: 6px;
  background: var(--md-card);
  border: 1px solid var(--md-line);
  border-radius: 8px;
  box-shadow: var(--md-shadow);
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
