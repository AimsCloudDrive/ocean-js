import { SourceMap } from "rolldown";

export interface XBuildPlugin {
  name: string;
  transform?: (
    code: string,
    source: SourceMap | null
  ) => string | { code: string; map: SourceMap | null };
}

class PluginError extends Error {
  constructor(pluginName: string, message: string, errorOption?: ErrorOptions) {
    super(`[xbuild-plugin:${pluginName}]: ${message}`, errorOption);
  }
}

type PluginTransformType = "transform";

export class PluginManager {
  private declare plugins: XBuildPlugin[];

  constructor(plugins: XBuildPlugin[] | PluginManager) {
    if (plugins instanceof PluginManager) {
      return plugins;
    } else {
      this.plugins = plugins;
    }
    this.plugins = this.plugins.filter(Boolean);
    this.checkPluginName();
  }

  private checkPluginName() {
    let pluginName = "";
    for (const { name } of this.plugins) {
      if (name === pluginName) {
        throw new PluginError(pluginName, "the name of plugin is exist.");
      }
    }
  }

  private transform(code: string, source: SourceMap | null) {
    let pluginName = "";
    let _source = source;
    try {
      for (const plugin of this.plugins) {
        pluginName = plugin.name;
        if (plugin.transform) {
          let recode = plugin.transform(code, _source);
          recode =
            typeof recode === "string" ? { code: recode, map: null } : recode;
          code = recode.code;
          _source = recode.map;
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

  apply(
    transform: PluginTransformType,
    code: string,
    source: SourceMap | null
  ) {
    return this[transform].call(this, code, source);
  }
}
