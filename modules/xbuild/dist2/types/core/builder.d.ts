import { ProxyRules } from "@msom/http";
import { RolldownOptions } from "rolldown";
import { PluginManager } from "./plugin";
import { XBuildContext, XbuildDevOptions } from "./types";
export declare class XBuilder {
    private config;
    private logger;
    constructor(config: XBuildContext);
    get pluginManager(): PluginManager;
    private buildHtml;
    private generate;
    get rolldownOptions(): RolldownOptions;
    private write;
    runBuild(): Promise<boolean>;
    private buildOne;
    get defaultDevOption(): {
        readonly port: 9999;
        readonly public: "public";
    };
    private getDevOptions;
    runDev(options: XbuildDevOptions): Promise<{
        port: number;
        proxy: ProxyRules | undefined | null;
    }>;
}
