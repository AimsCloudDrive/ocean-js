#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function scaffold(projectName, options = {}) {
  const projectDir = path.resolve(process.cwd(), projectName);
  
  // 创建项目目录
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  
  // 创建目录结构
  const dirs = [
    'bin',
    'src',
    'src/core',
    'src/commands',
    'src/utils',
    'src/plugins',
    'src/types',
    'public',
  ];
  
  for (const dir of dirs) {
    const fullPath = path.join(projectDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
  
  // 创建package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: 'Custom build tool based on rolldown',
    bin: {
      [projectName]: './bin/index.js'
    },
    scripts: {
      'build': `node bin/${projectName}.js build`,
      'dev': `node bin/${projectName}.js dev`,
      'check': `node bin/${projectName}.js check`,
      'lint': `node bin/${projectName}.js lint`
    },
    dependencies: {
      'rolldown': '^1.0.0',
      'commander': '^12.0.0',
      'chalk': '^5.0.0',
      'express': '^4.0.0',
      'http-proxy-middleware': '^2.0.0',
      'ws': '^8.0.0',
      'typescript': '^5.0.0'
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/express': '^4.0.0'
    }
  };
  
  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // 创建tsconfig.json
  const tsconfigJson = {
    compilerOptions: {
      target: 'ES2015',
      module: 'ESNext',
      moduleResolution: 'node',
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      outDir: 'dist',
      rootDir: 'src'
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  };
  
  fs.writeFileSync(
    path.join(projectDir, 'tsconfig.json'),
    JSON.stringify(tsconfigJson, null, 2)
  );
  
  // 创建CLI入口文件
  const cliEntry = `#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');

const program = new Command();
const packageJson = require('../package.json');

program
  .name('${projectName}')
  .version(packageJson.version)
  .description(packageJson.description);

// 注册命令
program
  .command('dev')
  .description('Start development server')
  .action(async () => {
    const { default: dev } = await import('../src/commands/dev.js');
    await dev();
  });

program
  .command('build')
  .description('Build for production')
  .action(async () => {
    const { default: build } = await import('../src/commands/build.js');
    await build();
  });

program
  .command('check')
  .description('Check for type errors')
  .action(async () => {
    const { default: check } = await import('../src/commands/check.js');
    await check();
  });

program
  .command('lint')
  .description('Lint code')
  .action(async () => {
    const { default: lint } = await import('../src/commands/lint.js');
    await lint();
  });

program.parse(process.argv);
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'bin', `${projectName}.js`),
    cliEntry
  );
  
  // 创建bin/index.js（指向主CLI文件）
  const binIndex = `#!/usr/bin/env node
require('./${projectName}.js');
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'bin', 'index.js'),
    binIndex
  );
  
  // 创建Builder类
  const builderTs = `import rolldown from 'rolldown';
import PluginSystem from './plugin-system';
import createEnvPlugin from '../plugins/env-plugin';
import createTypeScriptPlugin from '../plugins/typescript-plugin';
import ConfigLoader from '../utils/config-loader';

class Builder {
  private mode: string;
  private config: any;
  private pluginSystem: PluginSystem;

  constructor(mode: string) {
    this.mode = mode;
    this.pluginSystem = new PluginSystem();
    
    // 注册默认插件
    this.pluginSystem.register(createEnvPlugin(mode));
    this.pluginSystem.register(createTypeScriptPlugin());
  }

  async initialize() {
    // 查找配置文件
    const configPaths = [
      '${projectName}.config.ts',
      '${projectName}.config.js',
      '${projectName}.config.mjs',
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

    // 注册配置中的插件
    if (this.config.plugins) {
      for (const plugin of this.config.plugins) {
        this.pluginSystem.register(plugin);
      }
    }
  }

  async build() {
    if (!this.config) {
      await this.initialize();
    }

    // 执行buildStart钩子
    await this.pluginSystem.hook('buildStart');

    // 使用rolldown构建
    const bundle = await rolldown({
      input: this.config.input || 'src/index.ts',
      output: this.config.output || { dir: 'dist' },
      external: this.config.external || [],
      plugins: this.config.plugins || [],
    });

    await bundle.write();

    // 执行buildEnd钩子
    await this.pluginSystem.hook('buildEnd');
  }

  async dev() {
    if (!this.config) {
      await this.initialize();
    }

    // 构建初始代码
    await this.build();

    // 启动开发服务器
    const { default: DevServer } = await import('../utils/dev-server.js');
    const devServer = new DevServer({
      port: this.config.devServer?.port || 3000,
      publicDir: this.config.output?.dir || 'dist',
      proxy: this.config.devServer?.proxy,
    });

    await devServer.start();
  }
}

export default Builder;
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'core', 'builder.ts'),
    builderTs
  );
  
  // 创建插件系统
  const pluginSystemTs = `import Plugin from '../types/plugin';

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
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'core', 'plugin-system.ts'),
    pluginSystemTs
  );
  
  // 创建命令文件
  const devCommand = `import Builder from '../core/builder';

async function dev() {
  console.log('Starting development server...');
  
  const builder = new Builder('development');
  await builder.dev();
}

export default dev;
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'commands', 'dev.ts'),
    devCommand
  );
  
  const buildCommand = `import Builder from '../core/builder';

async function build() {
  console.log('Building for production...');
  
  const builder = new Builder('production');
  await builder.build();
  
  console.log('Build completed!');
}

export default build;
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'commands', 'build.ts'),
    buildCommand
  );
  
  const checkCommand = `import { execSync } from 'child_process';

async function check() {
  console.log('Checking for type errors...');
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('No type errors found!');
  } catch (error) {
    console.error('Type errors found!');
    process.exit(1);
  }
}

export default check;
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'commands', 'check.ts'),
    checkCommand
  );
  
  const lintCommand = `import { execSync } from 'child_process';

async function lint() {
  console.log('Linting code...');
  
  try {
    execSync('npx eslint src', { stdio: 'inherit' });
    console.log('No lint errors found!');
  } catch (error) {
    console.error('Lint errors found!');
    process.exit(1);
  }
}

export default lint;
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'commands', 'lint.ts'),
    lintCommand
  );
  
  // 创建配置加载器
  const configLoaderTs = `import fs from 'fs';
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
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'utils', 'config-loader.ts'),
    configLoaderTs
  );
  
  // 创建配置辅助函数
  const configTs = `import Plugin from '../types/plugin';

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
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'utils', 'config.ts'),
    configTs
  );
  
  // 创建环境变量加载器
  const envLoaderTs = `import fs from 'fs';
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
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'utils', 'env-loader.ts'),
    envLoaderTs
  );
  
  // 创建开发服务器
  const devServerTs = `import express from 'express';
import http from 'http';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

interface DevServerOptions {
  port: number;
  publicDir: string;
  proxy?: {
    [key: string]: {
      target: string;
      changeOrigin?: boolean;
      pathRewrite?: Record<string, string>;
    };
  };
}

class DevServer {
  private app: express.Application;
  private server: http.Server;
  private options: DevServerOptions;

  constructor(options: DevServerOptions) {
    this.options = options;
    this.app = express();
    this.setupMiddlewares();
  }

  private setupMiddlewares() {
    // 静态文件服务
    this.app.use(express.static(this.options.publicDir));

    // 代理配置
    if (this.options.proxy) {
      for (const [context, config] of Object.entries(this.options.proxy)) {
        this.app.use(context, createProxyMiddleware({
          target: config.target,
          changeOrigin: config.changeOrigin || true,
          pathRewrite: config.pathRewrite,
        }));
      }
    }

    // 处理SPA路由
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(this.options.publicDir, 'index.html'));
    });
  }

  start() {
    return new Promise<void>((resolve) => {
      this.server = this.app.listen(this.options.port, () => {
        console.log(`Dev server running at http://localhost:${this.options.port}`);
        
        // 打印代理信息
        if (this.options.proxy) {
          console.log('Proxy configuration:');
          for (const [context, config] of Object.entries(this.options.proxy)) {
            console.log(`  ${context} -> ${config.target}`);
          }
        }
        
        resolve();
      });
    });
  }

  stop() {
    return new Promise<void>((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Dev server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default DevServer;
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'utils', 'dev-server.ts'),
    devServerTs
  );
  
  // 创建类型定义
  const pluginType = `interface Plugin {
  name: string;
  order?: number;
  buildStart?: () => void | Promise<void>;
  buildEnd?: () => void | Promise<void>;
  resolveId?: (id: string, importer: string | undefined) => string | null | undefined | Promise<string | null | undefined>;
  load?: (id: string) => string | null | undefined | Promise<string | null | undefined>;
  transform?: (code: string, id: string) => string | null | undefined | Promise<string | null | undefined>;
}

export default Plugin;
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'types', 'plugin.ts'),
    pluginType
  );
  
  const envType = `declare global {
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
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'types', 'env.d.ts'),
    envType
  );
  
  // 创建插件
  const envPlugin = `import Plugin from '../types/plugin';
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
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'plugins', 'env-plugin.ts'),
    envPlugin
  );
  
  const typescriptPlugin = `import Plugin from '../types/plugin';
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
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'plugins', 'typescript-plugin.ts'),
    typescriptPlugin
  );
  
  // 创建示例配置文件
  const configExample = `import { defineConfig } from './src/utils/config';

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
  devServer: {
    port: 3000,
    publicDir: 'dist',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
}));
`;
  
  fs.writeFileSync(
    path.join(projectDir, `${projectName}.config.ts`),
    configExample
  );
  
  // 创建示例入口文件
  const indexTs = `console.log('Hello from ${projectName}!');
console.log('MODE:', import.meta.env.MODE);
console.log('DEV:', import.meta.env.DEV);
console.log('PROD:', import.meta.env.PROD);
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'src', 'index.ts'),
    indexTs
  );
  
  // 创建示例HTML文件
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="app">
    <h1>${projectName}</h1>
    <p>Build tool based on rolldown</p>
  </div>
  <script type="module" src="/index.js"></script>
</body>
</html>
`;
  
  fs.writeFileSync(
    path.join(projectDir, 'public', 'index.html'),
    indexHtml
  );
  
  // 复制HTML到dist目录
  if (!fs.existsSync(path.join(projectDir, 'dist'))) {
    fs.mkdirSync(path.join(projectDir, 'dist'));
  }
  
  fs.writeFileSync(
    path.join(projectDir, 'dist', 'index.html'),
    indexHtml
  );
  
  // 安装依赖
  console.log('Installing dependencies...');
  execSync('npm install', { cwd: projectDir, stdio: 'inherit' });
  
  console.log(`\n✅ ${projectName} has been created successfully!`);
  console.log(`\nTo get started:`);
  console.log(`  cd ${projectName}`);
  console.log(`  npm run dev`);
  console.log(`\nTo build for production:`);
  console.log(`  npm run build`);
}

// 解析命令行参数
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide a project name');
  console.log('Usage: scaffold <project-name>');
  process.exit(1);
}

const projectName = args[0];
scaffold(projectName);