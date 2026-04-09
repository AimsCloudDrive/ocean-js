# 插件架构设计

## 插件接口设计

```typescript
// src/types/plugin.ts
interface Plugin {
  name: string;
  order?: number;
  buildStart?: () => void | Promise<void>;
  buildEnd?: () => void | Promise<void>;
  resolveId?: (id: string, importer: string | undefined) => string | null | undefined | Promise<string | null | undefined>;
  load?: (id: string) => string | null | undefined | Promise<string | null | undefined>;
  transform?: (code: string, id: string) => string | null | undefined | Promise<string | null | undefined>;
}

export default Plugin;
```

## 钩子系统

```typescript
// src/core/plugin-system.ts
import Plugin from '../types/plugin';

class PluginSystem {
  private plugins: Plugin[] = [];

  register(plugin: Plugin) {
    this.plugins.push(plugin);
    // 按order排序
    this.plugins.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async hook(name: keyof Plugin, ...args: any[]) {
    for (const plugin of this.plugins) {
      const hook = plugin[name];
      if (typeof hook === 'function') {
        await hook.apply(plugin, args);
      }
    }
  }

  getPlugins() {
    return this.plugins;
  }
}

export default PluginSystem;
```

## 插件执行顺序

插件的执行顺序由`order`字段控制：

* 数值越小，执行优先级越高

* 默认为0

* 相同order的插件按注册顺序执行

```typescript
// 示例插件注册
pluginSystem.register({
  name: 'early-plugin',
  order: -100,
  buildStart() {
    console.log('Early plugin executing');
  }
});

pluginSystem.register({
  name: 'normal-plugin',
  order: 0, // 默认值
  buildStart() {
    console.log('Normal plugin executing');
  }
});

pluginSystem.register({
  name: 'late-plugin',
  order: 100,
  buildStart() {
    console.log('Late plugin executing');
  }
});
```

## 常用插件示例

### 1. 环境变量插件

```typescript
// src/plugins/env-plugin.ts
import Plugin from '../types/plugin';
import EnvLoader from '../utils/env-loader';

function createEnvPlugin(mode: string): Plugin {
  const envLoader = new EnvLoader(mode);

  return {
    name: 'env-plugin',
    order: -50,
    buildStart() {
      // 注入环境变量
      const define = envLoader.toDefinePlugin();
      // 假设this.define是rolldown插件API
      if (typeof this.define === 'function') {
        this.define(define);
      }
    }
  };
}

export default createEnvPlugin;
```

### 2. TypeScript插件

```typescript
// src/plugins/typescript-plugin.ts
import Plugin from '../types/plugin';
import ts from 'typescript';

function createTypeScriptPlugin(): Plugin {
  return {
    name: 'typescript-plugin',
    order: 0,
    transform(code: string, id: string) {
      if (id.endsWith('.ts') || id.endsWith('.tsx')) {
        const result = ts.transpileModule(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2015,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
          }
        });
        return result.outputText;
      }
      return null;
    }
  };
}

export default createTypeScriptPlugin;
```

### 3. CSS插件

```typescript
// src/plugins/css-plugin.ts
import Plugin from '../types/plugin';

function createCssPlugin(): Plugin {
  return {
    name: 'css-plugin',
    order: 50,
    load(id: string) {
      if (id.endsWith('.css')) {
        return `
          const style = document.createElement('style');
          style.textContent = \`${fs.readFileSync(id, 'utf-8')}\`;
          document.head.appendChild(style);
          export default style;
        `;
      }
      return null;
    }
  };
}

export default createCssPlugin;
```

### 4. 资源插件

```typescript
// src/plugins/asset-plugin.ts
import Plugin from '../types/plugin';
import path from 'path';
import crypto from 'crypto';

function createAssetPlugin(outputDir: string): Plugin {
  return {
    name: 'asset-plugin',
    order: 100,
    resolveId(id: string) {
      if (id.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
        return path.resolve(process.cwd(), id);
      }
      return null;
    },
    load(id: string) {
      if (id.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
        const content = fs.readFileSync(id);
        const hash = crypto.createHash('md5').update(content).digest('hex');
        const ext = path.extname(id);
        const filename = `assets/${hash}${ext}`;
        const outputPath = path.join(outputDir, filename);
        
        // 确保目录存在
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, content);
        
        return `export default '/${filename}';`;
      }
      return null;
    }
  };
}

export default createAssetPlugin;
```

## 插件配置系统

```typescript
// src/utils/config.ts
import Plugin from '../types/plugin';

interface BuildConfig {
  input: string | string[];
  output: {
    dir: string;
    format?: 'esm' | 'cjs' | 'iife';
  };
  external?: string[];
  plugins?: Plugin[];
  devServer?: {
    port: number;
    publicDir: string;
    proxy?: Record<string, any>;
  };
}

function defineConfig(config: BuildConfig | ((options: { mode: string }) => BuildConfig)) {
  return config;
}

export type { BuildConfig };
export { defineConfig };
```

## 插件加载

```typescript
// src/core/builder.ts
import PluginSystem from './plugin-system';
import createEnvPlugin from '../plugins/env-plugin';
import createTypeScriptPlugin from '../plugins/typescript-plugin';

class Builder {
  private pluginSystem: PluginSystem;

  constructor(mode: string) {
    this.pluginSystem = new PluginSystem();
    
    // 注册默认插件
    this.pluginSystem.register(createEnvPlugin(mode));
    this.pluginSystem.register(createTypeScriptPlugin());
  }

  registerPlugin(plugin: Plugin) {
    this.pluginSystem.register(plugin);
  }

  async build() {
    // 执行buildStart钩子
    await this.pluginSystem.hook('buildStart');
    
    // 构建逻辑
    // ...
    
    // 执行buildEnd钩子
    await this.pluginSystem.hook('buildEnd');
  }
}
```

## 插件开发最佳实践

1. **明确的插件名称**：使用唯一且描述性的名称
2. **合理的执行顺序**：根据插件功能设置适当的order
3. **错误处理**：插件内部应有完善的错误处理
4. **文档**：为插件提供清晰的文档和使用示例
5. **测试**：为插件编写测试用例
6. **性能**：避免在插件中执行耗时操作
7. **兼容性**：考虑不同环境下的兼容性

## 插件系统扩展

### 1. 插件上下文

为插件提供上下文信息：

```typescript
// src/core/plugin-context.ts
class PluginContext {
  private builder: Builder;

  constructor(builder: Builder) {
    this.builder = builder;
  }

  getConfig() {
    return this.builder.getConfig();
  }

  getMode() {
    return this.builder.getMode();
  }

  emitFile(filename: string, content: string) {
    // 实现文件输出
  }
}

// 在插件系统中使用
async hook(name: keyof Plugin, ...args: any[]) {
  const context = new PluginContext(this.builder);
  for (const plugin of this.plugins) {
    const hook = plugin[name];
    if (typeof hook === 'function') {
      // 将上下文作为第一个参数传递
      await hook.apply(Object.assign(plugin, context), args);
    }
  }
}
```

### 2. 插件依赖管理

```typescript
// 插件依赖检查
function checkPluginDependencies(plugin: Plugin, dependencies: string[]) {
  for (const dep of dependencies) {
    try {
      require.resolve(dep);
    } catch {
      throw new Error(`Plugin ${plugin.name} requires dependency ${dep}`);
    }
  }
}

// 使用
const plugin = createSomePlugin();
checkPluginDependencies(plugin, ['some-dependency']);
pluginSystem.register(plugin);
```

## 示例：完整的插件配置

```typescript
// build.config.ts
import { defineConfig } from './src/utils/config';
import createCssPlugin from './src/plugins/css-plugin';
import createAssetPlugin from './src/plugins/asset-plugin';

export default defineConfig({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
  },
  plugins: [
    createCssPlugin(),
    createAssetPlugin('dist'),
    {
      name: 'custom-plugin',
      order: 200,
      buildStart() {
        console.log('Custom plugin started');
      },
      buildEnd() {
        console.log('Custom plugin ended');
      }
    }
  ]
});
```

