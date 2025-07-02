// src/core/types.ts

import {
  ChunkFileNamesFunction,
  OutputOptions,
  RolldownOptions,
} from "rolldown";
import { PluginManager, XBuildPlugin } from "./plugin";

export type XBuildMode = "development" | "production";

export type XBuildOutputOptions = Omit<OutputOptions, "chunkFileNames"> & {
  chunkFileNames?:
    | string
    | ((
        chunkInfo: Parameters<ChunkFileNamesFunction>[0],
        format: string
      ) => string | undefined | null | void);
};

export interface XbuildDevOptions {
  port?: number;
  public?: string;
}

interface BaseXbuildConfig {
  build?: Omit<RolldownOptions, "output"> & {
    output?: XBuildOutputOptions | XBuildOutputOptions[];
  };
  dev?: XbuildDevOptions;
}

export interface XBuildConfig extends BaseXbuildConfig {
  plugins?: XBuildPlugin[];
}
export interface LoadedXbuildConfig extends BaseXbuildConfig {
  pluginManager: PluginManager;
}

export interface XBuildContext extends LoadedXbuildConfig {
  mode: XBuildMode;
}
type FuncEnable<T, Args extends any[] = []> = T | ((...args: Args) => T);
export type UserConfig = FuncEnable<
  XBuildConfig | Promise<XBuildConfig>,
  [{ mode: XBuildMode }]
>;
