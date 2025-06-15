import { Plugin as RollupPlugin } from "rollup";
import { XBuildPluginHooks } from "./types";

export interface XBuildPlugin {
  name: string;
  hooks?: XBuildPluginHooks;
  rollupPlugin?: () => RollupPlugin;
  devServer?: () => any;
}

class PluginManager {
  private declare plugins: XBuildPlugin[];

  constructor(plugins: XBuildPlugin[] | PluginManager) {
    if (plugins instanceof PluginManager) {
      return plugins;
    } else {
      this.plugins = plugins;
    }
  }

  async applyHook<K extends keyof XBuildPluginHooks>(
    hookName: K,
    ...args: Parameters<NonNullable<XBuildPluginHooks[K]>>
  ): Promise<void> {
    for (const plugin of this.plugins) {
      const hook = plugin.hooks?.[hookName];
      if (typeof hook === "function") {
        try {
          await (hook as any)(...args);
        } catch (error) {
          console.error(
            `Plugin ${plugin.name} hook ${hookName} failed:`,
            error
          );
        }
      }
    }
  }

  getRollupPlugins(): RollupPlugin[] {
    return this.plugins
      .map((p) => p.rollupPlugin?.())
      .filter(Boolean) as RollupPlugin[];
  }

  getDevPlugins(): any[] {
    return this.plugins.map((p) => p.devServer?.()).filter(Boolean) as any[];
  }
}

export { PluginManager };
