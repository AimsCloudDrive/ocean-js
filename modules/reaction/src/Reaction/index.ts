import { getGlobalData, setGlobalData } from "@ocean/common";

export interface IObserver {
  addReaction(reaction: Reaction): void;
  removeReaction(reaction: Reaction): void;
}

declare global {
  export namespace Ocean {
    export interface Store {
      "@ocean/reaction": {
        tracking?: (ob: IObserver) => void;
        observerListKey: symbol;
      };
    }
  }
}

setGlobalData("@ocean/reaction", {
  observerListKey: Symbol("observerList"),
});

export class Reaction {
  private declare tracker: () => void;
  private declare callback: () => void;
  private declare tracked: Set<IObserver>;
  private declare delay: "nextTick" | "nextFrame" | undefined;
  // 上一次更新还未执行则取消上一次更新
  private declare cancel?: () => void;
  constructor(props: {
    tracker: () => void;
    callback: () => void;
    delay?: "nextTick" | "nextFrame";
  }) {
    this.tracked = new Set();
    Object.assign(this, props);
    this.track();
    this.updateNextTick();
  }
  private _cancel() {
    this.cancel && this.cancel();
    this.cancel = undefined;
  }
  updateNextTick() {
    if (!this.delay) return;
    if (this.delay === "nextTick") {
      // 判断浏览器环境还是node环境
      if (typeof process !== "undefined" && process.nextTick) {
        // node环境
        this.nextTick = function (cb: () => void) {
          // 取消上一次的nextTick
          this._cancel();
          let canceled = false;
          process.nextTick(() => {
            if (!canceled) {
              cb();
            }
            this.cancel = undefined;
          });
          this.cancel = () => {
            // 取消nextTick的对调函数执行
            canceled = true;
          };
        };
      } else {
        // 浏览器环境
        this.nextTick = function (cb: () => void) {
          // 取消上一次的nextTick
          this._cancel();
          let canceled = false;
          queueMicrotask(() => {
            if (!canceled) {
              cb();
            }
            this.cancel = undefined;
          });
          this.cancel = () => {
            // 取消nextTick的对调函数执行
            canceled = true;
          };
        };
      }
    }
    if (this.delay === "nextFrame") {
      this.nextTick = function (cb: () => void) {
        this._cancel();
        const rafId = requestAnimationFrame(() => {
          cb();
          this.cancel = undefined;
        });
        this.cancel = () => {
          // 取消requestAnimationFrame的对调函数执行
          cancelAnimationFrame(rafId);
        };
      };
    }
  }
  nextTick(cb: () => void) {
    // 将函数放进微队列中，等待执行
    this._cancel();
    cb();
  }
  track() {
    const { tracker } = this;
    // 先清空tracked
    this.tracked.clear();
    const data = getGlobalData("@ocean/reaction");
    // 保存原始的tracking函数
    const tracking = data.tracking;
    // 更新tracking函数
    Object.assign(data, {
      tracking: (ob: IObserver) => {
        this.tracked.add(ob);
        ob.addReaction(this);
      },
    });
    try {
      // 执行tracker函数
      tracker();
    } catch (e) {
      // 清空已经追踪的observer
      this.destroy();
      throw e;
    } finally {
      // 恢复原始的tracking函数
      Object.assign(data, { tracking });
    }
  }

  patch() {
    this.nextTick(() => this.callback());
  }

  exec() {
    this.callback();
    return this;
  }

  disposer() {
    return this.destroy.bind(this);
  }

  destroy() {
    this.tracked.forEach((ob) => ob.removeReaction(this));
    this.tracked.clear();
  }
}

export function createReaction(
  tracker: () => void,
  callback: () => void,
  option?: { delay?: "nextTick" | "nextFrame" }
): Reaction;
export function createReaction(
  tracker: () => void,
  option?: { delay?: "nextTick" | "nextFrame" }
): Reaction;

export function createReaction(
  tracker: () => void,
  callback?: (() => void) | { delay?: "nextTick" | "nextFrame" },
  option?: { delay?: "nextTick" | "nextFrame" }
): Reaction {
  if (typeof callback === "function") {
    return new Reaction({ tracker, callback, delay: option?.delay });
  } else {
    if (callback) {
      if (option) throw "error params.";
      return new Reaction({
        tracker,
        callback: tracker,
        delay: callback.delay,
      });
    } else {
      return new Reaction({ tracker, callback: tracker, delay: option?.delay });
    }
  }
}

export function withoutTrack<T>(callback: () => T): T {
  const data = getGlobalData("@ocean/reaction");
  const tracking = data.tracking;
  Object.assign(data, { tracking: undefined });
  let res: T;
  try {
    res = callback();
  } catch (e) {
    throw e;
  } finally {
    Object.assign(data, { tracking });
  }
  return res;
}
