# @msom/model-designer

模型设计器（Model Designer）：基于 @msom 本地子项目构建的模型设计器组件库。

## 依赖的本地子项目

| 子项目 | 说明 |
| --- | --- |
| `@msom/xbuild` | 构建工具，提供 `xbuild` 命令与 `defineConfig` |
| `@msom/common` | 公共工具库（事件、断言、类型等） |
| `@msom/dom` | DOM 渲染引擎与 JSX 运行时 |
| `@msom/component` | 类组件框架（`@component`、`@option` 装饰器） |
| `@msom/reaction` | 响应式系统（`@observer`、`computed`、`Reaction`） |

## 快速开始

```ts
import {
  ModelDesigner,
  createHttpModelDesignerApi,
  mountModelDesigner,
} from "@msom/model-designer";

const api = createHttpModelDesignerApi({ baseUrl: "/api/model-designer" });

// 方式一：挂载到容器，挂载后自动请求 bootstrap。
const designerRef = mountModelDesigner(document.getElementById("root")!, {
  title: "业务模型",
  api,
});

// 方式二：在 JSX 中使用。
function App() {
  return <ModelDesigner api={api} />;
}
```

也可以直接传入实现 `ModelDesignerApi` 的适配器，以对接已有接口路径。默认 HTTP 适配器使用以下端点：

- `GET /bootstrap`：加载 `{ canvas, models, relations }`
- `/models`：创建、更新和删除模型
- `PATCH /models/:id`：更新模型属性或在拖动结束后提交 `position`
- `/relations`：创建、更新和删除关系
- `PUT /canvas`：更新画布中心、缩放和锁定状态

创建、删除、属性与锁定操作会立即调用接口；节点位置只在拖动结束时提交。请求失败时组件会回滚本地变更并显示错误信息。

## 开发

```bash
# 类型检查
pnpm run check

# 几何逻辑测试
pnpm run test

# 构建（xbuild）
pnpm run build::xbuild
```

## 目录结构

```
src/
├── api.ts                      # 默认 HTTP 接口适配器
├── geometry.ts                 # 网格、框选与关系路径算法
├── index.ts                    # 入口
├── types.ts                    # 模型、关系与 API 契约
└── designer/
    ├── ModelDesigner.tsx       # 模型设计器组件
    ├── style.ts                # 组件样式
    └── index.ts
```
