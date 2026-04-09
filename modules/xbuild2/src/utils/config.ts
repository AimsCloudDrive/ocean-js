import Plugin from '../types/plugin';

interface BuildConfig {
  input: string | string[];
  output: {
    dir: string;
    format?: 'esm' | 'cjs' | 'iife';
  };
  external?: string[];
  plugins?: Plugin[];
  devServer?: {
    port: number;
    publicDir: string;
    proxy?: Record<string, any>;
  };
}

function defineConfig(config: BuildConfig | ((options: { mode: string }) => BuildConfig)) {
  return config;
}

export type { BuildConfig };
export { defineConfig };