import { SourceMap } from "rolldown";
export interface XBuildPlugin {
    name: string;
    order?: number;
    transform?: (code: string, id: string | null, source: SourceMap | null) => string | {
        code: string;
        map?: SourceMap | null;
    };
}
interface PluginHooks extends Required<Omit<XBuildPlugin, "name" | "order">> {
}
type PluginTransformType = keyof PluginHooks;
export declare class PluginManager implements PluginHooks {
    private plugins;
    private pluginMap;
    constructor(plugins?: XBuildPlugin[] | PluginManager | null);
    addPlugins(plugins?: Iterable<XBuildPlugin>): number;
    addPlugin(...plugins: XBuildPlugin[]): number;
    private get sortPlugins();
    private checkPluginName;
    transform(code: string, id: string | null, source: SourceMap | null): {
        code: string;
        map: SourceMap | null;
    };
    apply<T extends PluginTransformType>(hook: T, ...args: Parameters<PluginHooks[T]>): {
        code: string;
        map: SourceMap | null;
    };
}
export {};
