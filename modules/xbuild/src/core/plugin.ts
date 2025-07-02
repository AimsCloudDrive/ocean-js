import { FunctionPluginHooks, SourceMap } from "rolldown";

export interface XBuildPlugin {
  name: string;
  order?: number;
  transform?: (
    code: string,
    id: string | null,
    source: SourceMap | null
  ) => string | { code: string; map?: SourceMap | null };
}

class PluginError extends Error {
  constructor(pluginName: string, message: string, errorOption?: ErrorOptions) {
    super(`[xbuild-plugin:${pluginName}]: ${message}`, errorOption);
  }
}

interface PluginHooks extends Required<Omit<XBuildPlugin, "name" | "order">> {}

type PluginTransformType = keyof PluginHooks;

export class PluginManager implements PluginHooks {
  private declare plugins: XBuildPlugin[];
  private declare pluginMap: Map<XBuildPlugin["name"], XBuildPlugin>;

  constructor(plugins?: XBuildPlugin[] | PluginManager | null) {
    if (plugins instanceof PluginManager) {
      return plugins;
    } else {
      this.plugins = plugins || [];
    }
    this.plugins = this.plugins.filter(Boolean);
    this.pluginMap = new Map();
    this.checkPluginName();
  }

  addPlugins(plugins: Iterable<XBuildPlugin> = []): number {
    const n = this.plugins.push(...plugins);
    this.checkPluginName();
    return n;
  }
  addPlugin(...plugins: XBuildPlugin[]): number {
    return this.addPlugins(plugins);
  }

  private get sortPlugins() {
    const notOrder = this.plugins.filter(
      ({ order }) => typeof order === "undefined"
    );
    const sorted = this.plugins
      .filter(({ order }) => typeof order !== "undefined")
      .sort((a, b) => a.order! - b.order!);
    return [...sorted, ...notOrder];
  }

  private checkPluginName() {
    this.pluginMap.clear();
    try {
      for (const plugin of this.plugins) {
        if (this.pluginMap.has(plugin.name)) {
          throw new PluginError(plugin.name, "the name of plugin is exist.");
        }
        this.pluginMap.set(plugin.name, plugin);
      }
    } catch (e) {
      this.pluginMap.clear();
      this.plugins.length = 0;
      throw e;
    }
  }
  transform(code: string, id: string | null, source: SourceMap | null) {
    let pluginName = "";
    let _source = source;
    try {
      for (const plugin of this.sortPlugins) {
        pluginName = plugin.name;
        if (plugin.transform) {
          let recode = plugin.transform(code, id, _source);
          recode =
            typeof recode === "string" ? { code: recode, map: null } : recode;
          code = recode.code;
          _source = recode.map || _source;
        }
      }
      return {
        code,
        map: _source || source,
      };
    } catch (e) {
      throw new PluginError(
        pluginName,
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  apply<T extends PluginTransformType>(
    hook: T,
    ...args: Parameters<PluginHooks[T]>
  ) {
    return this[hook].apply(this, args);
  }
}
