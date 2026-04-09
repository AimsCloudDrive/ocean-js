# 自构建实现模式

## 配置文件编译流程

```typescript
// src/utils/config-loader.ts
import fs from 'fs';
import path from 'path';
import rolldown from 'rolldown';

interface ConfigLoaderOptions {
  configPath: string;
  mode: string;
}

class ConfigLoader {
  private options: ConfigLoaderOptions;

  constructor(options: ConfigLoaderOptions) {
    this.options = options;
  }

  async load() {
    const { configPath, mode } = this.options;
    
    // 检查配置文件是否存在
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    // 使用rolldown编译配置文件
    const tempConfigPath = path.resolve(process.cwd(), '.temp-config.mjs');
    
    try {
      // 编译配置文件
      const bundle = await rolldown({
        input: configPath,
        external: () => true, // 所有依赖都外部化
        output: {
          format: 'esm',
        },
      });

      // 写入临时文件
      await bundle.write({ file: tempConfigPath, format: 'esm' });

      // 动态导入配置
      const configModule = await import(tempConfigPath);
      const config = configModule.default || configModule;

      // 如果配置是函数，执行它并传入mode
      if (typeof config === 'function') {
        return config({ mode });
      }

      return config;
    } finally {
      // 清理临时文件
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }
    }
  }
}

export default ConfigLoader;
```

## 循环依赖处理

自构建的核心挑战是处理循环依赖：工具需要构建自己的配置文件，但配置文件又依赖于工具本身。

**解决方案**：

1. **所有依赖外部化**：在编译配置文件时，将所有依赖标记为external，这样rolldown就不会尝试打包它们
2. **使用动态导入**：配置文件编译后，通过动态import加载，此时工具已经在内存中运行
3. **临时文件隔离**：使用临时文件作为中间产物，避免直接依赖

## 临时文件管理

```typescript
// 临时文件管理
const tempDir = path.resolve(process.cwd(), '.temp');

// 确保临时目录存在
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const tempConfigPath = path.join(tempDir, 'config.mjs');

// 清理临时文件的函数
function cleanTempFiles() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// 在进程退出时清理
process.on('exit', cleanTempFiles);
process.on('SIGINT', cleanTempFiles);
process.on('SIGTERM', cleanTempFiles);
```

## 缓存策略

为了提高性能，可以实现配置文件缓存：

```typescript
// 配置文件缓存
class ConfigCache {
  private cache: Map<string, { mtime: number; config: any }> = new Map();

  get(configPath: string) {
    const stats = fs.statSync(configPath);
    const cached = this.cache.get(configPath);

    if (cached && cached.mtime === stats.mtimeMs) {
      return cached.config;
    }

    return null;
  }

  set(configPath: string, config: any) {
    const stats = fs.statSync(configPath);
    this.cache.set(configPath, {
      mtime: stats.mtimeMs,
      config,
    });
  }

  clear() {
    this.cache.clear();
  }
}

// 使用缓存
const configCache = new ConfigCache();

async function loadConfig(configPath: string, mode: string) {
  // 尝试从缓存获取
  const cachedConfig = configCache.get(configPath);
  if (cachedConfig) {
    return cachedConfig;
  }

  // 加载配置
  const loader = new ConfigLoader({ configPath, mode });
  const config = await loader.load();

  // 存入缓存
  configCache.set(configPath, config);

  return config;
}
```

## 集成到构建工具

```typescript
// src/core/builder.ts
import ConfigLoader from '../utils/config-loader';

class Builder {
  private mode: string;
  private config: any;

  constructor(mode: string) {
    this.mode = mode;
  }

  async initialize() {
    // 查找配置文件
    const configPaths = [
      'build.config.ts',
      'build.config.js',
      'build.config.mjs',
    ];

    let configPath: string | null = null;
    for (const path of configPaths) {
      if (fs.existsSync(path)) {
        configPath = path;
        break;
      }
    }

    if (!configPath) {
      throw new Error('No config file found');
    }

    // 加载配置
    const loader = new ConfigLoader({ configPath, mode: this.mode });
    this.config = await loader.load();
  }

  async build() {
    if (!this.config) {
      await this.initialize();
    }

    // 使用配置进行构建
    const bundle = await rolldown({
      input: this.config.input || 'src/index.ts',
      output: this.config.output || { dir: 'dist' },
      plugins: this.config.plugins || [],
    });

    await bundle.write();
  }
}
```

## 工具自己的配置文件

```typescript
// build.config.ts
import { defineConfig } from './src/utils/config';

export default defineConfig(({ mode }) => ({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  external: [
    'rolldown',
    'commander',
    'chalk',
    'express',
    'http-proxy-middleware',
    'ws',
    'fs',
    'path',
    'os',
    'child_process',
  ],
  plugins: [
    // 插件配置
  ],
}));
```

## 测试自构建

```bash
# 构建工具自身
node dist/bin/build.js build

# 运行构建后的工具
node dist/bin/build.js dev
```

## 常见问题

### 1. 配置文件编译失败

**原因**：配置文件中使用了TypeScript语法，但rolldown默认不处理TypeScript

**解决方案**：确保rolldown配置包含TypeScript插件

### 2. 临时文件权限问题

**原因**：系统权限限制导致无法创建或删除临时文件

**解决方案**：使用用户可写的目录作为临时目录，如`os.tmpdir()`

### 3. 缓存导致配置不更新

**原因**：缓存没有正确失效

**解决方案**：监听配置文件变化，或在开发模式下禁用缓存