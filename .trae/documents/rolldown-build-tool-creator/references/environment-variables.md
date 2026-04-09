# 环境变量系统详解

## dotenv加载实现

```typescript
// src/utils/env-loader.ts
import fs from 'fs';
import path from 'path';

class EnvLoader {
  private env: Record<string, string> = {};
  private mode: string;

  constructor(mode: string) {
    this.mode = mode;
    this.load();
  }

  private load() {
    const envFiles = [
      '.env',
      '.env.local',
      `.env.${this.mode}`,
      `.env.${this.mode}.local`
    ];

    // 反向遍历，确保优先级正确
    for (let i = envFiles.length - 1; i >= 0; i--) {
      const envFile = envFiles[i];
      const fullPath = path.resolve(process.cwd(), envFile);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^([^#\s=]+)\s*=\s*(.*)$/);
          if (match) {
            const [, key, value] = match;
            this.env[key] = value.replace(/^"|"$/g, '');
          }
        }
      }
    }

    // 设置默认环境变量
    this.env.MODE = this.mode;
    this.env.DEV = this.mode === 'development' ? 'true' : 'false';
    this.env.PROD = this.mode === 'production' ? 'true' : 'false';
  }

  get(key: string, defaultValue?: string): string {
    return this.env[key] || process.env[key] || defaultValue || '';
  }

  getAll(): Record<string, string> {
    return { ...this.env, ...process.env };
  }

  toDefinePlugin(): Record<string, string> {
    const define: Record<string, string> = {};
    const allEnv = this.getAll();

    for (const [key, value] of Object.entries(allEnv)) {
      define[`import.meta.env.${key}`] = JSON.stringify(value);
    }

    return define;
  }
}

export default EnvLoader;
```

## import.meta.env注入机制

在rolldown配置中使用define插件：

```typescript
// src/core/builder.ts
import rolldown from 'rolldown';
import EnvLoader from '../utils/env-loader';

class Builder {
  private envLoader: EnvLoader;

  constructor(mode: string) {
    this.envLoader = new EnvLoader(mode);
  }

  async build() {
    const bundle = await rolldown({
      input: 'src/index.ts',
      plugins: [
        {
          name: 'env-define',
          buildStart() {
            this.define(this.envLoader.toDefinePlugin());
          }
        }
      ]
    });

    await bundle.write({ dir: 'dist' });
  }
}
```

## 环境变量类型定义

```typescript
// src/types/env.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MODE: 'development' | 'production';
      DEV: 'true' | 'false';
      PROD: 'true' | 'false';
      [key: string]: string | undefined;
    }
  }
}

declare interface ImportMeta {
  env: {
    MODE: 'development' | 'production';
    DEV: boolean;
    PROD: boolean;
    [key: string]: string | boolean | undefined;
  };
}

export {}
```

## 客户端/服务端环境变量区分

- **客户端环境变量**: 会被注入到代码中，需要注意敏感信息
- **服务端环境变量**: 只在构建时使用，不会暴露给客户端

建议在.env文件中使用前缀区分：
- `VITE_` 或 `CLIENT_` 前缀的变量会被注入到客户端
- 其他变量只在服务端使用