<script setup vapor lang="ts">
import { useDesigner } from "./composer/useDesigner";
import type { ModelDesignerApi } from "./types";
import CanvasStage from "./components/CanvasStage.vue";
import ToolbarPanel from "./components/ToolbarPanel.vue";
import DrawerPanel from "./components/DrawerPanel.vue";

const props = withDefaults(
  defineProps<{
    title?: string;
    api?: ModelDesignerApi;
    bootstrap?: boolean;
  }>(),
  {
    title: "模型设计器",
    bootstrap: true,
  }
);

const designer = useDesigner({
  title: props.title,
  api: props.api,
  bootstrap: props.bootstrap,
});
</script>

<template>
  <section class="model-designer-vue">
    <ToolbarPanel :designer="designer" :title="props.title" />
    <div class="model-designer-vue__main">
      <CanvasStage :designer="designer" />
      <DrawerPanel :designer="designer" />
    </div>
  </section>
</template>

<style scoped>
.model-designer-vue {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--md-card);
  border-radius: var(--md-radius);
  box-shadow: var(--md-shadow);
}
.model-designer-vue__main {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
