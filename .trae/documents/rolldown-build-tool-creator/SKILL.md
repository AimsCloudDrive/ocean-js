# rolldown-build-tool-creator Skill

## 基本信息

**名称**: `rolldown-build-tool-creator`

**描述**:

```
Guide developers in creating custom build tools based on rolldown. Use this skill when users want to:
- Create a new build tool from scratch using rolldown
- Set up CLI commands (dev, build, check, lint) with proper environment handling
- Implement environment variable loading patterns (.env files, import.meta.env)
- Configure self-building capability (tool builds itself)
- Integrate development servers with hot reload
- Set up plugin systems for extensibility

Trigger on phrases like: "create build tool", "rolldown构建工具", "自定义打包工具", "开发构建系统", "build tool with rolldown", "类似webpack的工具", "create bundler", or when users mention needing dev/build commands with environment management.
```

## 引导流程

### Step 1: 项目初始化

- 创建项目目录结构
- 设置package.json（依赖：rolldown, commander, chalk等）
- 配置TypeScript（tsconfig.json）

### Step 2: CLI入口点

- 创建bin/目录和入口文件
- 使用commander设置命令结构
- 注册dev、build、check、lint命令

### Step 3: 核心构建器

- 创建Builder类封装rolldown逻辑
- 实现build()和dev()方法
- 配置默认插件和外部依赖

### Step 4: 环境变量系统

- 实现.env文件加载（支持[mode][.local].env模式）
- 设置MODE、DEV、PROD自动注入
- 配置import.meta.env替换（使用rolldown的define插件）

### Step 5: 开发服务器

- 集成Express或其他HTTP服务器
- 配置静态文件服务
- 实现代理功能
- 添加热更新支持

### Step 6: 配置系统

- 创建defineConfig辅助函数
- 实现配置文件加载（支持.ts/.js/.mjs）
- 使用rolldown编译配置文件（自构建的关键）

### Step 7: 自构建配置

- 创建工具自己的配置文件
- 配置external依赖
- 测试工具能否构建自己

## 关键实现模式

### 环境变量加载优先级:

```
.env.production.local  (highest priority)
.env.production
.env.local
.env                   (lowest priority)
```

### 命令与环境的映射:

- `dev` → MODE=development, DEV=true, PROD=false
- `build` → MODE=production, DEV=false, PROD=true

### 自构建的核心:

```typescript
// 使用rolldown编译配置文件
const bundle = await rolldown({
  input: configPath,
  external: () => true, // 所有依赖都外部化
});
await bundle.write({ file: ".temp-config.mjs", format: "esm" });
const config = await import(".temp-config.mjs");
```

## 最佳实践

- 使用单例模式管理环境变量
- 插件系统支持order字段控制执行顺序
- 日志系统使用chalk进行彩色输出
- 错误处理要清晰，提供有用的错误信息
- 配置文件支持函数式配置（接收mode参数）

## 常见问题

- 如何处理TypeScript类型定义生成？
- 如何支持JSX/TSX？
- 如何实现watch模式？
- 如何处理CSS/Less/Sass？
- 如何配置代码分割？