<script setup vapor lang="ts">
import { computed } from "vue";
import type { DesignerController } from "../composer/useDesigner";
import { FIELD_TYPE_OPTIONS, MODEL_COLORS } from "../composer/useDesigner";

const props = defineProps<{
  designer: DesignerController;
}>();

const d = props.designer;
const drawer = computed(() => d.drawer);

const currentModel = computed(() => {
  const dw = drawer.value;
  if (dw.type === "model") return d.models.find((m) => m.id === dw.id);
  return undefined;
});
const currentRelation = computed(() => {
  const dw = drawer.value;
  if (dw.type === "relation") return d.relations.find((r) => r.id === dw.id);
  return undefined;
});
</script>

<template>
  <aside v-if="drawer.type !== 'closed'" class="md-drawer">
    <!-- 模型抽屉 -->
    <template v-if="drawer.type === 'model'">
      <header class="md-drawer__header">
        <strong>模型属性</strong>
        <button class="md-drawer__close" @click="d.closeDrawer">×</button>
      </header>
      <div class="md-drawer__body">
        <template v-if="currentModel">
          <div class="md-field">
            <span class="md-field__label">模型 ID</span>
            <input
              v-model="drawer.modelId"
              disabled
            />
          </div>
          <div class="md-field">
            <span class="md-field__label">名称</span>
            <input
              v-model="drawer.name"
              :disabled="d.readOnly"
              @input="d.setDrawerDraft({ name: (($event.target as HTMLInputElement) && ($event.target as HTMLInputElement).value) || '' })"
            />
          </div>
          <div class="md-field">
            <span class="md-field__label">描述</span>
            <textarea
              v-model="drawer.description"
              :disabled="d.readOnly"
              @input="d.setDrawerDraft({ description: (($event.target as HTMLTextAreaElement) && ($event.target as HTMLTextAreaElement).value) || '' })"
            />
          </div>
          <div class="md-field">
            <span class="md-field__label">颜色</span>
            <div class="md-color-row">
              <button
                v-for="c in MODEL_COLORS"
                :key="c"
                class="md-color-swatch"
                :class="{ 'is-active': drawer.color === c }"
                :style="{ background: c }"
                :disabled="d.readOnly"
                @click="d.setDrawerDraft({ color: c })"
              />
            </div>
          </div>
          <div class="md-field">
            <span class="md-field__label">继承模型</span>
            <select :value="currentModel.parentModelId ?? ''" disabled>
              <option value="">无</option>
            </select>
          </div>

          <!-- 字段 -->
          <div class="md-field-section">
            <div class="md-field-section__header">
              <span>字段（{{ (currentModel.fields || []).filter((f) => !f.inherited).length }}）
                {{ (currentModel.fields || []).some((f) => f.inherited) ? `· 继承 ${(currentModel.fields || []).filter((f) => f.inherited).length}` : '' }}</span>
              <button
                v-if="(currentModel.fields || []).some((f) => f.inherited)"
                class="md-btn md-btn--ghost md-btn--sm"
                @click="d.toggleInheritedFields(currentModel)"
              >
                {{ currentModel.showInheritedFields !== false ? '隐藏继承' : '显示继承' }}
              </button>
            </div>

            <!-- 继承字段（只读） -->
            <ul v-if="currentModel.showInheritedFields !== false">
              <li
                v-for="field in (currentModel.fields || []).filter((f) => f.inherited)"
                :key="field.id"
                class="md-field-item is-inherited"
              >
                <button class="md-field-collapse" @click="d.toggleFieldExpand(field.id)">
                  {{ d.isFieldExpanded(field.id) ? '▾' : '▸' }}
                </button>
                <span class="md-field-name">{{ field.name }}</span>
                <span class="md-field-type">{{ field.type }}</span>
                <span class="md-field-tag">继承</span>
                <div v-if="d.isFieldExpanded(field.id) && field.description" class="md-field-desc">
                  {{ field.description }}
                </div>
              </li>
            </ul>

            <!-- 本模型字段 -->
            <ul>
              <li
                v-for="(field, idx) in (currentModel.fields || []).filter((f) => !f.inherited)"
                :key="field.id"
                class="md-field-item"
              >
                <button class="md-field-collapse" @click="d.toggleFieldExpand(field.id)">
                  {{ d.isFieldExpanded(field.id) ? '▾' : '▸' }}
                </button>
                <input
                  class="md-field-name-input"
                  :value="field.name"
                  :disabled="d.readOnly"
                  @input="d.updateField(currentModel, field.id, { name: ($event.target as HTMLInputElement).value })"
                />
                <select
                  class="md-field-type-select"
                  :value="field.type"
                  :disabled="d.readOnly"
                  @change="d.updateField(currentModel, field.id, { type: ($event.target as HTMLSelectElement).value })"
                >
                  <option v-for="t in FIELD_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
                </select>
                <div class="md-field-actions">
                  <button class="md-btn md-btn--ghost md-btn--sm" :disabled="d.readOnly || idx === 0" @click="d.moveField(currentModel, field.id, -1)">↑</button>
                  <button class="md-btn md-btn--ghost md-btn--sm" :disabled="d.readOnly || idx === (currentModel.fields || []).filter((f) => !f.inherited).length - 1" @click="d.moveField(currentModel, field.id, 1)">↓</button>
                  <button class="md-btn md-btn--danger md-btn--sm" :disabled="d.readOnly" @click="d.removeField(currentModel, field.id)">删</button>
                </div>
                <div v-if="d.isFieldExpanded(field.id)" class="md-field-desc">
                  <textarea
                    class="md-field-desc-input"
                    placeholder="字段描述"
                    :value="field.description ?? ''"
                    :disabled="d.readOnly"
                    @input="d.updateField(currentModel, field.id, { description: ($event.target as HTMLTextAreaElement).value })"
                  />
                </div>
              </li>
            </ul>
            <button class="md-btn md-btn--sm md-field-add" :disabled="d.readOnly" @click="d.addField(currentModel)">
              + 添加字段
            </button>
          </div>
        </template>
      </div>
      <footer class="md-drawer__footer">
        <button
          class="md-btn md-btn--primary"
          :disabled="d.readOnly || d.saving || !drawer.name.trim()"
          @click="d.saveDrawer"
        >
          {{ d.saving ? '保存中' : '保存' }}
        </button>
      </footer>
    </template>

    <!-- 关系抽屉 -->
    <template v-else-if="drawer.type === 'relation'">
      <header class="md-drawer__header">
        <strong>关系属性</strong>
        <button class="md-drawer__close" @click="d.closeDrawer">×</button>
      </header>
      <div class="md-drawer__body" v-if="currentRelation">
        <div class="md-direction">
          <span class="md-direction__title">
            {{
              (d.models.find((m) => m.id === currentRelation.sourceId)?.name || currentRelation.sourceId)
              + ' → '
              + (d.models.find((m) => m.id === currentRelation.targetId)?.name || currentRelation.targetId)
            }}
          </span>
          <div class="md-field">
            <span class="md-field__label">关系名称</span>
            <input
              :value="drawer.fwdName"
              :disabled="d.readOnly"
              @input="d.setDrawerDraft({ fwdName: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="md-field">
            <span class="md-field__label">映射</span>
            <div class="md-mapping-row">
              <button
                v-for="m in ['1', 'm', 'n']"
                :key="m"
                class="md-btn md-btn--sm"
                :class="drawer.fwdMapping === m ? 'md-btn--active' : ''"
                :disabled="d.readOnly"
                @click="d.setDrawerDraft({ fwdMapping: m })"
              >{{ m }}</button>
            </div>
          </div>
        </div>

        <div class="md-direction">
          <span class="md-direction__title">
            {{
              (d.models.find((m) => m.id === currentRelation.targetId)?.name || currentRelation.targetId)
              + ' → '
              + (d.models.find((m) => m.id === currentRelation.sourceId)?.name || currentRelation.sourceId)
            }}
          </span>
          <div class="md-field">
            <span class="md-field__label">关系名称</span>
            <input
              :value="drawer.revName"
              :disabled="d.readOnly"
              @input="d.setDrawerDraft({ revName: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="md-field">
            <span class="md-field__label">映射</span>
            <div class="md-mapping-row">
              <button
                v-for="m in ['1', 'm', 'n']"
                :key="m"
                class="md-btn md-btn--sm"
                :class="drawer.revMapping === m ? 'md-btn--active' : ''"
                :disabled="d.readOnly"
                @click="d.setDrawerDraft({ revMapping: m })"
              >{{ m }}</button>
            </div>
          </div>
        </div>
      </div>
      <footer class="md-drawer__footer">
        <button class="md-btn md-btn--danger" :disabled="d.readOnly || d.saving" @click="d.deleteRelation(currentRelation!.id)">
          删除
        </button>
        <button class="md-btn md-btn--primary" :disabled="d.readOnly || d.saving" @click="d.saveDrawer">
          {{ d.saving ? '保存中' : '保存' }}
        </button>
      </footer>
    </template>
  </aside>
</template>

<style scoped>
.md-drawer {
  width: 320px;
  flex: none;
  border-left: 1px solid var(--md-line);
  background: var(--md-card);
  display: flex;
  flex-direction: column;
}
.md-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--md-line);
  font-size: 15px;
}
.md-drawer__close {
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--md-ink-3);
  cursor: pointer;
}
.md-drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.md-drawer__footer {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--md-line);
}
.md-drawer__footer .md-btn {
  flex: 1;
}
.md-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.md-field__label {
  font-size: 12px;
  color: var(--md-ink-3);
}
input,
textarea,
select {
  padding: 6px 8px;
  border: 1px solid var(--md-line);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: var(--md-ink);
  background: #fff;
}
textarea {
  resize: vertical;
  min-height: 40px;
}
input:disabled,
textarea:disabled,
select:disabled {
  background: #f3f4f6;
  color: var(--md-ink-3);
}
.md-color-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.md-color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
}
.md-color-swatch.is-active {
  border-color: var(--md-ink);
}
.md-field-section {
  border-top: 1px solid var(--md-line);
  padding-top: 8px;
  margin-top: 4px;
}
.md-field-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}
.md-field-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 13px;
  flex-wrap: wrap;
}
.md-field-item.is-inherited {
  background: #f8fafc;
  padding: 4px 6px;
  border-radius: 6px;
  border-bottom: none;
}
.md-field-collapse {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  color: var(--md-ink-3);
}
.md-field-name {
  flex: 1;
  min-width: 60px;
}
.md-field-type {
  color: var(--md-ink-3);
  font-size: 12px;
}
.md-field-tag {
  font-size: 10px;
  color: var(--md-ink-3);
  background: #f3f4f6;
  border-radius: 4px;
  padding: 1px 5px;
}
.md-field-name-input {
  flex: 1;
  min-width: 60px;
  padding: 3px 6px;
  font-size: 13px;
}
.md-field-type-select {
  font-size: 12px;
  padding: 3px 4px;
}
.md-field-actions {
  display: flex;
  gap: 2px;
}
.md-field-desc {
  width: 100%;
  color: var(--md-ink-3);
  font-size: 12px;
  padding-left: 18px;
}
.md-field-desc-input {
  width: 100%;
  font-size: 12px;
}
.md-field-add {
  margin-top: 6px;
  width: 100%;
}
.md-direction {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--md-line);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.md-direction__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--md-primary);
}
.md-mapping-row {
  display: flex;
  gap: 4px;
}
.md-mapping-row .md-btn {
  flex: 1;
}
</style>
