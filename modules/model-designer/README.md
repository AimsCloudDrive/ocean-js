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
import { ModelDesigner, mountModelDesigner } from "@msom/model-designer";

// 方式一：挂载模型设计器到容器
const designerRef = mountModelDesigner(document.getElementById("root")!);
designerRef.current?.add(<div>模型节点</div>);

// 方式二：在 JSX 中使用
function App() {
  return <ModelDesigner />;
}
```

## 开发

```bash
# 类型检查
pnpm run check

# 构建（xbuild）
pnpm run build::xbuild
```

## 目录结构

```
src/
├── index.ts                    # 入口
├── types.ts                    # 模型节点与面板配置类型
└── designer/
    ├── ModelDesigner.tsx       # 模型设计器示例组件
    └── index.ts
```
