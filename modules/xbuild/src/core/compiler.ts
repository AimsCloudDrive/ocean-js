import ts from "typescript";
import { Logger } from "../utils/logger";
import { LoadedXbuildConfig } from "./types";

export class TypeScriptCompiler {
  private config?: LoadedXbuildConfig;
  private logger: Logger = new Logger("TypeScript");

  constructor(config: LoadedXbuildConfig | undefined) {
    this.config = config;
  }

  async checkTypes(): Promise<boolean> {
    this.logger.info("Running TypeScript type check...");

    const tsConfig = this.getTsConfig();
    const program = ts.createProgram({
      rootNames: tsConfig.fileNames,
      options: tsConfig.options,
    });

    const diagnostics = ts.getPreEmitDiagnostics(program);

    if (diagnostics.length > 0) {
      const formatHost: ts.FormatDiagnosticsHost = {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine,
      };

      const message = ts.formatDiagnostics(diagnostics, formatHost);
      this.logger.error("TypeScript type check failed:\n" + message);
      return false;
    }

    this.logger.success("TypeScript type check passed");
    return true;
  }

  async emitDeclarations(): Promise<boolean> {
    this.logger.info("Generating type declarations...");

    const tsConfig = this.getTsConfig();
    const program = ts.createProgram({
      rootNames: tsConfig.fileNames,
      options: {
        ...tsConfig.options,
        declaration: true,
        emitDeclarationOnly: true,
        noEmit: false,
      },
    });

    const emitResult = program.emit();
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics);

    if (diagnostics.length > 0) {
      const formatHost: ts.FormatDiagnosticsHost = {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine,
      };

      const message = ts.formatDiagnostics(diagnostics, formatHost);
      this.logger.error("Declaration generation failed:\n" + message);
      return false;
    }

    this.logger.success("Type declarations generated");
    return true;
  }

  private getTsConfig(): ts.ParsedCommandLine {
    const configPath = ts.findConfigFile(
      process.cwd(),
      ts.sys.fileExists,
      "tsconfig.json"
    );

    if (!configPath) {
      throw new Error("tsconfig.json not found");
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    return ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      process.cwd()
    );
  }
}
