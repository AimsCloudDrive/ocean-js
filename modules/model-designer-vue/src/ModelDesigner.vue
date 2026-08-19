<script setup vapor lang="ts">
  import { useDesigner } from "./composer/useDesigner";
  import type { ModelDesignerApi } from "./types";
  import CanvasStage from "./components/CanvasStage.vue";
  import DrawerPanel from "./components/DrawerPanel.vue";
  import ConnectDialog from "./components/ConnectDialog.vue";

  const props = withDefaults(
    defineProps<{
      title?: string;
      api?: ModelDesignerApi;
      bootstrap?: boolean;
      /** 数据库主机地址 */
      dbHost?: string;
      /** 数据库端口 */
      dbPort?: number;
      /** 默认业务数据库名 */
      db?: string;
      /** 数据库用户名 */
      user?: string;
      /** 数据库密码；未接收时为驱动弹出连接信息表单 */
      password?: string;
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
    connection: {
      dbHost: props.dbHost,
      dbPort: props.dbPort,
      db: props.db,
      user: props.user,
      password: props.password,
    },
  });
</script>

<template>
  <section class="model-designer-vue">
    <CanvasStage :designer="designer" />
    <DrawerPanel :designer="designer" />
    <ConnectDialog
      :open="designer.connectionDialog"
      :defaults="designer.connectionDefault"
      :connecting="designer.connecting"
      :error="designer.connectionError"
      @confirm="designer.confirmConnection"
      @cancel="designer.cancelConnection"
    />
  </section>
</template>

<style scoped>
  .model-designer-vue {
    position: relative;
    display: flex;
    height: 100%;
    overflow: hidden;
    background: var(--md-card);
  }
</style>
