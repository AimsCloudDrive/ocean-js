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