<script setup vapor lang="ts">
import type { DesignerController } from "../composer/useDesigner";

const props = defineProps<{
  designer: DesignerController;
  title?: string;
}>();

const d = props.designer;
</script>

<template>
  <header class="md-toolbar">
    <div class="md-toolbar__left">
      <span class="md-toolbar__title">{{ title || "模型设计器" }}</span>
      <span class="md-toolbar__stats">{{ d.models.length }} 模型 · {{ d.relations.length }} 关系</span>
    </div>
    <div class="md-toolbar__actions">
      <label class="md-toolbar__database">
        <span>数据库</span>
        <select
          :value="d.currentDatabase"
          :disabled="d.databases.length === 0 || d.loading || d.switchingDatabase"
          @change="d.changeDatabase(($event.target as HTMLSelectElement).value)"
        >
          <option v-if="d.databases.length === 0" value="">暂无数据库</option>
          <option v-for="db in d.databases" :key="db" :value="db">{{ db }}</option>
        </select>
      </label>
      <button
        class="md-btn"
        :class="d.readOnly ? '' : 'md-btn--active'"
        @click="d.toggleMode"
      >
        {{ d.modeLabel }}
      </button>
      <button class="md-btn" :disabled="d.readOnly || d.saving" @click="d.syncPositions">
        同步位置
      </button>
      <button
        v-if="d.selectedIds.length > 0"
        class="md-btn md-btn--danger"
        :disabled="d.readOnly || d.saving"
        @click="d.deleteSelected"
      >
        删除({{ d.selectedIds.length }})
      </button>
    </div>
  </header>
</template>

<style scoped>
.md-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--md-line);
  gap: 12px;
  flex-wrap: wrap;
}
.md-toolbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.md-toolbar__title {
  font-weight: 700;
  font-size: 15px;
}
.md-toolbar__stats {
  font-size: 12px;
  color: var(--md-ink-3);
}
.md-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.md-toolbar__database {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--md-ink-3);
}
.md-toolbar__database select {
  height: 30px;
  min-width: 150px;
  border: 1px solid var(--md-line);
  border-radius: 6px;
  background: var(--md-card);
  color: var(--md-ink-1);
  padding: 0 8px;
  outline: none;
}
.md-toolbar__database select:disabled {
  color: var(--md-ink-3);
  background: var(--md-bg);
}
</style>
