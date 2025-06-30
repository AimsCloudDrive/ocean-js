// src/utils/logger.ts

import chalk from "chalk";

type LogLevel = "info" | "warn" | "error" | "success";

type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T
  ? 1
  : 2) extends <G>() => G extends U ? 1 : 2
  ? Y
  : N;

type ReadonlyKeys<T> = {
  [P in keyof T]-?: IfEquals<
    { [Q in P]: T[P] },
    { readonly [Q in P]: T[P] },
    P,
    never
  >;
}[keyof T];

type ChalkColors = Exclude<ReadonlyKeys<typeof chalk>, "reset">;

const colorMap: {
  [K in LogLevel]: { prefix: ChalkColors; message: ChalkColors };
} = {
  info: {
    prefix: "blue",
    message: "gray",
  },
  warn: {
    prefix: "yellow",
    message: "yellow",
  },
  error: {
    prefix: "red",
    message: "red",
  },
  success: {
    prefix: "green",
    message: "green",
  },
};

export class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
    Object.defineProperties(
      this,
      Object.keys(colorMap).reduce((map, key: LogLevel) => {
        map[key] = {
          value: function (this: Logger, message: string, ...args: any[]) {
            this.log(key, message, ...args);
          },
        };
        return map;
      }, {} as PropertyDescriptorMap)
    );
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toLocaleTimeString();
    let prefix = `[${timestamp}] ${this.prefix}:`;

    prefix = chalk[colorMap[level].prefix](prefix);
    message = chalk[colorMap[level].message](message);

    console.log(`${prefix} ${message}`, ...args);
  }

  info: LeveLCall;
  warn: LeveLCall;
  error: LeveLCall;
  success: LeveLCall;

  progress(message: string, current: number, total: number) {
    const percent = Math.round((current / total) * 100);
    const progressBar = `[${"=".repeat(percent / 5)}${" ".repeat(
      20 - percent / 5
    )}]`;
    this.info(`${message} ${progressBar} ${percent}% (${current}/${total})`);
  }
}

interface LeveLCall {
  (message: string, ...args: any[]): void;
}
