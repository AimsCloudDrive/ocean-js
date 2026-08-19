<script setup lang="ts">
  import ModelDesigner from "@msom/model-designer-vue";
  import "@msom/model-designer-vue/style.css";

  // 数据库连接信息（组件固定通过相对路径 /api 访问后端，由部署环境转发到模型设计器后端）。
  // 不传 password，以演示：组件会弹出数据库连接信息表单，回显已给的值并等待用户补全密码。
  const dbHost = "47.109.110.125";
  const dbPort = 27017;
  const db = "model-designer";
  const user = "mongo";
  const password = "tx009618.";
</script>

<template>
  <div class="demo-shell">
    <ModelDesigner
      :dbHost="dbHost"
      :dbPort="dbPort"
      :user="user"
      :password="password"
      :db="db"
      title="模型设计器组件示例"
    />
  </div>
</template>

<style>
  html,
  body,
  #app {
    height: 100%;
    margin: 0;
  }
  .demo-shell {
    height: 100%;
    padding: 16px;
    box-sizing: border-box;
  }
</style>
