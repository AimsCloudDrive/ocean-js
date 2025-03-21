import { getGlobalData, setGlobalData } from "@ocean/common";

export interface IObserver {
  addReaction(reaction: Reaction): void;
  removeReaction(reaction: Reaction): void;
}

export type $REACTION = {
  tracking?: (ob: IObserver) => void;
  reaction?: Reaction;
};

setGlobalData("@ocean/reaction", {} as $REACTION);

export type ReactionOption = {
  tracker: () => void;
  callback?: () => void;
  scheduler?: "nextTick" | "nextFrame" | undefined | ((cb: () => void) => void);
};
export class Reaction {
  private declare option: ReactionOption;
  private declare tracked: Set<IObserver>;
  // 上一次更新还未执行则取消上一次更新
  private declare cancel?: () => void;
  constructor(option: ReactionOption) {
    this.tracked = new Set();
    this.option = option;
    this.updateNextTick();
    this.track();
  }
  private _cancel() {
    this.cancel && this.cancel();
    this.cancel = undefined;
  }
  /**
   * 根据传入的delay选项，初始化微队列函数
   * @returns
   */
  updateNextTick() {
    const { scheduler } = this.option;
    if (!scheduler) return;
    if (scheduler === "nextTick") {
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
    } else if (scheduler === "nextFrame") {
      this.nextTick = function (cb: () => void) {
        this._cancel();
        if (Reflect.has(globalThis, "requestAnimationFrame")) {
          const rafId = requestAnimationFrame(() => {
            cb();
            this.cancel = undefined;
          });
          this.cancel = () => {
            // 取消requestAnimationFrame的对调函数执行
            cancelAnimationFrame(rafId);
          };
        } else {
          const id = setTimeout(() => {
            cb();
            this.cancel = undefined;
          }, 1000 / 60);
          this.cancel = () => {
            clearTimeout(id);
            this.cancel = undefined;
          };
        }
      };
    } else {
      this.nextTick = scheduler;
    }
  }
  nextTick(cb: () => void) {
    // 将函数放进微队列中，等待执行
    this._cancel();
    cb();
  }
  track() {
    const { tracker } = this.option;
    // 增量更新 先清空关联
    this.destroy();
    const reactionData = getGlobalData("@ocean/reaction") as $REACTION;
    // 保存原始的tracking函数
    const { tracking, reaction } = reactionData;
    try {
      // 更新tracking函数
      Object.assign(reactionData, {
        tracking: this.addObserver.bind(this),
        reaction: this,
      });
      // 执行tracker函数
      tracker();
    } catch (e) {
      // 清空已经追踪的observer
      this.destroy();
      throw e;
    } finally {
      // 恢复原始的tracking函数
      Object.assign(reactionData, { tracking, reaction });
    }
  }

  notify() {
    const { reaction } = getGlobalData("@ocean/reaction") as $REACTION;
    if (reaction && reaction === this) {
      console.error(
        "The value of the dependent observer is being changed in the current tracking"
      );
    } else {
      this.nextTick(() => {
        this.runcall();
      });
    }
  }

  exec() {
    this.runcall();
    return this;
  }

  private runcall() {
    const { callback } = this.option;
    callback ? callback() : this.track();
  }

  disposer() {
    return this.destroy.bind(this);
  }

  destroy() {
    this.tracked.forEach(this.removeObserver.bind(this));
  }
  addObserver(observer: IObserver) {
    this.tracked.add(observer);
    observer.addReaction(this);
  }
  removeObserver(observer: IObserver) {
    this.tracked.delete(observer);
    observer.removeReaction(this);
  }
}

export function createReaction(
  tracker: () => void,
  callback: () => void,
  option?: { scheduler?: ReactionOption["scheduler"] }
): Reaction;
export function createReaction(
  tracker: () => void,
  option?: { scheduler?: ReactionOption["scheduler"] }
): Reaction;

export function createReaction(
  tracker: () => void,
  callback?: (() => void) | { scheduler?: ReactionOption["scheduler"] },
  option?: { scheduler?: ReactionOption["scheduler"] }
): Reaction {
  if (typeof callback === "function") {
    return new Reaction({ tracker, callback, scheduler: option?.scheduler });
  } else {
    if (callback) {
      if (option) throw "error params.";
      return new Reaction({
        tracker,
        scheduler: callback.scheduler,
      });
    } else {
      return new Reaction({ tracker, scheduler: option?.scheduler });
    }
  }
}

export function withoutTrack<T>(callback: () => T): T {
  const reactionData = getGlobalData("@ocean/reaction") as $REACTION;
  const { tracking, reaction } = reactionData;
  reactionData.tracking = undefined;
  reactionData.reaction = undefined;
  try {
    return callback();
  } catch (e) {
    throw e;
  } finally {
    Object.assign(reactionData, { tracking, reaction });
  }
}
