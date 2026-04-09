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