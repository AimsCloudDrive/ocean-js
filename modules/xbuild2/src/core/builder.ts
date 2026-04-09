import rolldown from 'rolldown';
import PluginSystem from './plugin-system';
import createEnvPlugin from '../plugins/env-plugin';
import createTypeScriptPlugin from '../plugins/typescript-plugin';
import ConfigLoader from '../utils/config-loader';
import fs from 'fs';

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
      'xbuild2.config.ts',
      'xbuild2.config.js',
      'xbuild2.config.mjs',
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