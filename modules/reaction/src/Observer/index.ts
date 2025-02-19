import { Reaction, IObserver } from "../Reaction";
import { getGlobalData } from "@ocean/common";

export type ObserverOption<T> = {
  value?: T;
  equal?: (oldValue: T, newValue: T) => boolean;
  deep?: boolean;
  // TODO: add more options
};

export class Observer<T = unknown> implements IObserver {
  private declare handles: Set<Reaction>;
  private declare value: T;
  private declare equal: (oldValue: T, newValue: T) => boolean;
  private declare deep: boolean;
  constructor(option: ObserverOption<T> = {}) {
    this.equal = (oldValue, newValue) => oldValue === newValue;
    this.deep = false;
    Object.assign(this, option);
    this.handles = new Set();
    this.cheekDeep();
  }

  cheekDeep() {
    if (typeof this.value === "object" && this.deep) {
      const that = this;
      // 创建一个代理
      function createProxy<TP extends object>(target: TP) {
        return new Proxy(target, {
          get: (target, prop) => {
            if (typeof target[prop] === "object") {
              return createProxy(target[prop]);
            }
            return target[prop];
          },
          set(target, prop, value) {
            const oldValue = target[prop];
            target[prop] = value;
            if (!that.equal(oldValue, value)) {
              that.update();
            }
            return true;
          },
        });
      }
      this.value = createProxy(this.value as object) as T;
    }
  }
  get(): T {
    const running = getGlobalData("@ocean/reaction") as {
      tracking: (observer: Observer<unknown>) => void;
    };
    if (running?.tracking) {
      running.tracking(this);
    }
    return this.value;
  }
  set(newValue: T) {
    const { value: oldValue } = this;
    // 更新值
    this.value = newValue;
    // 比较新值
    if (!this.equal(oldValue, newValue)) {
      this.update();
    }
  }
  update() {
    for (const reaction of this.handles) {
      reaction.patch();
    }
  }
  addReaction(reaction: Reaction): void {
    this.handles.add(reaction);
  }
  removeReaction(reaction: Reaction): void {
    this.handles.delete(reaction);
  }
}
