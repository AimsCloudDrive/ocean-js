// src/core/types.ts
import { RollupOptions, OutputOptions, Plugin as RollupPlugin } from "rollup";
import { RollupBabelInputPluginOptions } from "@rollup/plugin-babel";
import { PluginManager, XBuildPlugin } from "./plugin";

export type XBuildMode = "development" | "production";

export interface XBuildPluginHooks {
  beforeBuild?: () => Promise<void>;
  afterBuild?: (success: boolean, error?: Error | unknown) => Promise<void>;
  beforeCheck?: () => Promise<void>;
  afterCheck?: (success: boolean) => Promise<void>;
  beforeDeclaration?: () => Promise<void>;
  afterDeclaration?: (success: boolean) => Promise<void>;
  beforeCompile?: () => Promise<void>;
  afterCompile?: (success: boolean) => Promise<void>;
}

export interface XBuildOutputOptions extends OutputOptions {
  dir?: string;
  file?: string;
}
interface BaseXbuildConfig {
  input: string | string[] | { [entryName: string]: string };
  output?: XBuildOutputOptions | XBuildOutputOptions[];
  babelOption?: RollupBabelInputPluginOptions;
  mode?: XBuildMode;
  rollupOptions?: RollupOptions;
  watch?: boolean;
  serve?: boolean;
  port?: number;
}

export interface XBuildConfig extends BaseXbuildConfig {
  plugins?: XBuildPlugin[];
}
export interface LoadedXbuildConfig extends BaseXbuildConfig {
  plugins: PluginManager;
}

export interface XBuildContext {
  config: XBuildConfig;
  plugins: PluginManager;
  mode: XBuildMode;
}

export type UserConfig =
  | Partial<XBuildConfig>
  | ((env: { mode: XBuildMode }) => Partial<XBuildConfig>);

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
