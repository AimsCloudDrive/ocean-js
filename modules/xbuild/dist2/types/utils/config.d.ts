import { LoadedXbuildConfig, UserConfig } from "../core/types";
interface LoadConfigOptions {
    compile: boolean;
}
export declare function loadConfig(userConfigPath: string | undefined, options?: LoadConfigOptions): Promise<LoadedXbuildConfig | undefined>;
export declare function defineConfig(config: UserConfig): UserConfig;
export {};
