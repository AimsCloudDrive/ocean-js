import { OutputOptions, RollupOptions, rollup } from "rollup";
import { Logger } from "../utils/logger";
import { PluginManager } from "./plugin";
import { LoadedXbuildConfig } from "./types";

export class XBuilder {
  private config: LoadedXbuildConfig;
  private plugins: PluginManager;
  private logger: Logger = new Logger("Builder");

  constructor(config: LoadedXbuildConfig) {
    this.config = config;
    this.plugins = new PluginManager(config.plugins || []);
  }

  async runBuild(
    rollupOptions: RollupOptions,
    outputOptions: OutputOptions | OutputOptions[]
  ) {
    process.env.NODE_ENV = "production";
    try {
      await this.plugins.applyHook("beforeBuild");

      const bundle = await rollup({
        ...rollupOptions,
        plugins: [
          ...[rollupOptions.plugins].flat(),
          ...this.plugins.getRollupPlugins(),
        ],
      });
      outputOptions = [outputOptions].flat();
      for (let i = 0; i < outputOptions.length; i++) {
        const element = outputOptions[i];
        const j = i;
        outputOptions[j] = bundle.write(element) as any;
      }
      await Promise.all(outputOptions);
      await bundle.close();

      this.logger.success("Build completed successfully");
      await this.plugins.applyHook("afterBuild", true);
      return true;
    } catch (error) {
      delete process.env.NODE_ENV;
      this.logger.error("Build failed", error);
      await this.plugins.applyHook("afterBuild", false, error);
      return false;
    }
  }

  async runDev(rollupOptions: RollupOptions, outputOptions: OutputOptions) {
    const { watch } = await import("rollup");

    const watcher = watch({
      ...rollupOptions,
      output: outputOptions,
      plugins: [
        ...[rollupOptions.plugins].flat(),
        ...this.plugins.getRollupPlugins(),
        ...this.plugins.getDevPlugins(),
      ],
    });

    watcher.on("event", (event) => {
      switch (event.code) {
        case "START":
          this.logger.info("Checking for changes...");
          break;
        case "BUNDLE_START":
          this.logger.info(`Bundling ${event.input}...`);
          break;
        case "BUNDLE_END":
          this.logger.success(`Bundle written to ${event.output}`);
          break;
        case "ERROR":
          this.logger.error("Build error", event.error);
          break;
      }
    });

    return watcher;
  }
}
