import { Reaction, IObserver } from "../Reaction";
import { getGlobalData } from "@ocean/common";

export type ObserverOption<T> = {
  value?: T;
  equal?: (oldValue: T, newValue: T) => boolean;
  // TODO: add more options
};

const equal = (oldValue: unknown, newValue: unknown) => oldValue === newValue;

export class Observer<T = unknown> implements IObserver {
  private declare handles: Set<Reaction>;
  private declare value: T;
  private declare equal: (oldValue: T, newValue: T) => boolean;
  constructor(option: ObserverOption<T> = {}) {
    this.equal = equal;
    Object.assign(this, option);
    this.handles = new Set();
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

  set(newValue: T): void {
    const { value: oldValue } = this;
    // 更新值
    this.value = newValue;
    // 比较新值
    if (!this.equal(oldValue, newValue)) {
      this.update();
    }
  }
  update(): void {
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
  destroy() {
    this.handles.forEach((reaction) => {
      reaction.removeObserver(this);
    });
  }
}

const proxyWeakMap = new WeakMap<
  WeakKey,
  ReturnType<typeof Proxy.revocable>["proxy"]
>();
export function reactive<T extends object>(value: T) {
  if (typeof value === "object" && value !== null) {
    let proxy = proxyWeakMap.get(value);
    if (proxy) {
      return proxy;
    }
    const observers = new Map<string | symbol, Observer<unknown>>();
    proxy = new Proxy(value, {
      get: (target, propName) => {
        if (Reflect.has(target, propName)) {
          const value = target[propName];
          const observer = new Observer({ value });
          observers.set(propName, observer);
          return reactive(observer.get());
        } else {
          return target[propName];
        }
      },
      set: (target, propName, value) => {
        target[propName] = value;
        const isUpdate = Reflect.has(target, propName);
        if (isUpdate) {
          const observer = observers.get(propName);
          if (observer) {
            observer.set(value);
          }
        } else {
          const observer = new Observer({ value });
          observers.set(propName, observer);
        }
        return true;
      },
      deleteProperty: (target, propName) => {
        delete target[propName];
        const observer = observers.get(propName);
        if (observer) {
          observer.update();
          observer.destroy();
        }
        observers.delete(propName);
        return true;
      },
    });
    proxyWeakMap.set(value, proxy);
    return proxy;
  } else {
    return value;
  }
}
