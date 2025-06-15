// src/utils/logger.ts

type LogLevel = "info" | "warn" | "error" | "success";

export class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toLocaleTimeString();
    let prefix = `[${timestamp}] ${this.prefix}:`;

    // switch (level) {
    //   case "info":
    //     prefix = chalk.blue(prefix);
    //     message = chalk.gray(message);
    //     break;
    //   case "warn":
    //     prefix = chalk.yellow(prefix);
    //     message = chalk.yellow(message);
    //     break;
    //   case "error":
    //     prefix = chalk.red(prefix);
    //     message = chalk.red(message);
    //     break;
    //   case "success":
    //     prefix = chalk.green(prefix);
    //     message = chalk.green(message);
    //     break;
    // }

    console.log(`${prefix} ${message}`, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log("error", message, ...args);
  }

  success(message: string, ...args: any[]) {
    this.log("success", message, ...args);
  }

  progress(message: string, current: number, total: number) {
    const percent = Math.round((current / total) * 100);
    const progressBar = `[${"=".repeat(percent / 5)}${" ".repeat(
      20 - percent / 5
    )}]`;
    this.info(`${message} ${progressBar} ${percent}% (${current}/${total})`);
  }
}
