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
        chunkName: Parameters<ChunkFileNamesFunction>[0],
        format: string
      ) => string | undefined | null | void);
};

interface BaseXbuildConfig {
  build?: Omit<RolldownOptions, "output"> & {
    output?: XBuildOutputOptions | XBuildOutputOptions[];
  };
  dev?: {
    port?: number;
    public?: string;
  };
}

export interface XBuildConfig extends BaseXbuildConfig {
  plugins?: XBuildPlugin[];
}
export interface LoadedXbuildConfig extends BaseXbuildConfig {
  plugins: PluginManager;
}

export interface XBuildContext extends LoadedXbuildConfig {
  mode: XBuildMode;
}

export type UserConfig =
  | Partial<XBuildConfig>
  | ((env: { mode: XBuildMode }) => Partial<XBuildConfig>);
