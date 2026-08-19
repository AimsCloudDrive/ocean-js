<script setup vapor lang="ts">
import { reactive, watch } from "vue";
import type { MongoConnectionInfo } from "../types";

const props = defineProps<{
  open: boolean;
  defaults: MongoConnectionInfo;
  connecting: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  confirm: [info: MongoConnectionInfo];
  cancel: [];
}>();

const form = reactive({
  dbHost: props.defaults.dbHost ?? "127.0.0.1",
  dbPort: props.defaults.dbPort || 27017,
  user: props.defaults.user ?? "",
  password: props.defaults.password ?? "",
});

watch(
  () => props.defaults,
  (defaults) => {
    form.dbHost = defaults.dbHost ?? "127.0.0.1";
    form.dbPort = defaults.dbPort || 27017;
    form.user = defaults.user ?? "";
    form.password = defaults.password ?? "";
  },
  { deep: true }
);

function confirm(): void {
  emit("confirm", {
    dbHost: form.dbHost,
    dbPort: form.dbPort,
    db: props.defaults.db,
    user: form.user,
    password: form.password,
  });
}
</script>

<template>
  <Teleport v-if="open" to="body">
    <div class="md-connect-mask">
      <div class="md-connect">
        <header class="md-connect__header">
          <strong>数据库连接信息</strong>
          <span class="md-connect__tip">请填写 MongoDB 连接信息</span>
        </header>

        <div class="md-connect__body">
          <label class="md-connect__field">
            <span class="md-connect__label">IP / 主机</span>
            <input
              :value="form.dbHost"
              type="text"
              placeholder="例如 47.109.110.125"
              @input="form.dbHost = ($event.target as HTMLInputElement).value"
            />
          </label>

          <label class="md-connect__field">
            <span class="md-connect__label">端口</span>
            <input
              :value="form.dbPort"
              type="number"
              min="1"
              max="65535"
              @input="form.dbPort = Number(($event.target as HTMLInputElement).value) || 27017"
            />
          </label>

          <label class="md-connect__field">
            <span class="md-connect__label">用户名</span>
            <input
              :value="form.user"
              type="text"
              placeholder="例如 mongo"
              autocomplete="username"
              @input="form.user = ($event.target as HTMLInputElement).value"
            />
          </label>

          <label class="md-connect__field">
            <span class="md-connect__label">密码</span>
            <input
              :value="form.password"
              type="password"
              placeholder="请输入密码"
              autocomplete="current-password"
              @input="form.password = ($event.target as HTMLInputElement).value"
            />
          </label>

          <p v-if="error" class="md-connect__error">{{ error }}</p>
        </div>

        <footer class="md-connect__footer">
          <button class="md-btn" :disabled="connecting" @click="emit('cancel')">
            取消
          </button>
          <button
            class="md-btn md-btn--primary"
            :disabled="connecting || !form.dbHost.trim() || !form.user.trim()"
            @click="confirm"
          >
            {{ connecting ? "连接中…" : "确定" }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.md-connect-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.md-connect {
  width: 100%;
  max-width: 400px;
  background: var(--md-card);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.md-connect__header {
  padding: 16px 18px;
  border-bottom: 1px solid var(--md-line);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.md-connect__header strong {
  font-size: 15px;
}
.md-connect__tip {
  font-size: 12px;
  color: var(--md-ink-3);
}
.md-connect__body {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.md-connect__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.md-connect__label {
  font-size: 12px;
  color: var(--md-ink-3);
}
.md-connect__error {
  font-size: 12px;
  color: var(--md-danger);
  margin: 0;
}
.md-connect__footer {
  display: flex;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--md-line);
}
.md-connect__footer .md-btn {
  flex: 1;
}
</style>