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