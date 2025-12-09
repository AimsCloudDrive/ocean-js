import { assert, equal, getGlobalData, isObject } from "@msom/common";
import {
  OPERATORMAPS,
  OPERATORTYPES,
  TRACKERTYPES,
  TRRIGERTYPES,
  iterator,
} from "../Operator";
import { $REACTION, IObserver, Reaction } from "../Reaction";

export type ObserverOption<T> = {
  initValue?: T;
  equal?: (oldValue: T, newValue: T) => boolean;
  deep?: boolean;
  // TODO: add more options
};

export class Observer<T = unknown> implements IObserver {
  private declare destroyed: boolean;
  private declare handlers: Set<Reaction>;
  private declare value: T;
  private declare equal: (oldValue: T, newValue: T) => boolean;
  private declare $option: ObserverOption<T>;
  constructor(option: ObserverOption<T> = {}) {
    this.destroyed = false;
    this.equal = option.equal || equal;
    this.handlers = new Set();
    if (Reflect.has(option, "initValue")) {
      const value = option.initValue;
      assert(value);
      this.value = value;
    }
    this.$option = option;
  }
  track() {
    const running = getGlobalData("@msom/reaction") as $REACTION;
    if (running?.tracking) {
      running.tracking(this);
    }
  }
  private reactiveValue(value: T): T {
    return this.$option.deep && isObject(value) ? reactive(value) : value;
  }
  get(): T {
    if (this.destroyed) {
      return this.value;
    }
    this.track();
    return this.value;
  }

  set(newValue: T): void {
    const { value: oldValue } = this;
    // 更新值
    this.value = this.reactiveValue(newValue);
    // 比较新值
    if (!this.destroyed && !this.equal(oldValue, newValue)) {
      this.notify();
    }
  }
  notify(): void {
    const handles = [...this.handlers];
    for (const reaction of handles) {
      reaction.notify();
    }
  }
  addReaction(reaction: Reaction): void {
    this.handlers.add(reaction);
  }
  removeReaction(reaction: Reaction): void {
    this.handlers.delete(reaction);
  }
  destroy() {
    this.handlers.forEach((reaction) => {
      reaction.removeObserver(this);
    });
    this.destroyed = true;
  }
}
function getObserverForce(
  target: object,
  propKey: PropertyKey,
  trackType: TRACKERTYPES
) {
  let _target = targetMap.get(target);
  if (!_target) {
    targetMap.set(target, (_target = { propMap: new Map() }));
  }
  if (!_target.propMap) {
    _target.propMap = new Map();
  }
  const propMap = _target.propMap;
  let typesMap = propMap.get(propKey);
  if (!typesMap) {
    propMap.set(propKey, (typesMap = new Map()));
  }
  let observer = typesMap.get(trackType);
  if (!observer) {
    typesMap.set(
      trackType,
      (observer = new Observer({ initValue: target[propKey] }))
    );
  }

  return observer;
}
function getObserver(
  target: object,
  propKey: PropertyKey,
  trackType: TRACKERTYPES
) {
  return targetMap.get(target)?.propMap?.get(propKey)?.get(trackType);
}

type TypesMap = Map<TRACKERTYPES, Observer>;

type PropMap = Map<PropertyKey, TypesMap>;
type _Target = {
  proxy?: unknown;
  propMap: PropMap;
};
type TargetMap = WeakMap<WeakKey, _Target>;
const targetMap: TargetMap = new WeakMap();

function track(target: object, propKey: PropertyKey, trackType: TRACKERTYPES) {
  getObserverForce(target, propKey, trackType).track();
}

function trriger(
  target: object,
  propKey: PropertyKey,
  trrigerType: TRRIGERTYPES,
  destroy?: boolean
) {
  const trackTypes = OPERATORMAPS[trrigerType];
  for (const trackType of trackTypes) {
    const observer = getObserver(target, propKey, trackType);
    if (!observer) continue;
    observer.notify();
    destroy && observer.destroy();
  }
}

const reactiveOptions: ProxyHandler<object> = {
  get(target, propKey, receiver) {
    const value = Reflect.get(target, propKey, receiver);
    track(target, propKey, OPERATORTYPES.TRACKER.GET);

    if (isObject(value)) {
      return reactive(value);
    }
    if (typeof value === "function") {
      return value.bind(receiver);
    }
    return value;
  },
  has(target, propKey) {
    const result = Reflect.has(target, propKey);
    track(target, propKey, OPERATORTYPES.TRACKER.HAS);
    return result;
  },
  ownKeys(target) {
    const result = Reflect.ownKeys(target);

    // Track iteration for all collection types
    track(target, Symbol.iterator, OPERATORTYPES.TRACKER[Symbol.iterator]);

    return result;
  },
  set(target, propKey, value, receiver) {
    const result = Reflect.set(target, propKey, value, receiver);
    let trrigerType: TRRIGERTYPES = Reflect.has(target, propKey)
      ? OPERATORTYPES.TRRIGER.SET
      : OPERATORTYPES.TRRIGER.ADD;
    if (result) {
      trriger(target, propKey, trrigerType);
    }
    return result;
  },
  deleteProperty(target, propKey) {
    const result = Reflect.deleteProperty(target, propKey);
    if (result) {
      const _target = targetMap.get(target);
      if (_target && _target.propMap && _target.propMap.has(propKey)) {
        trriger(target, propKey, OPERATORTYPES.TRRIGER.DELETE, true);
        _target.propMap.delete(propKey);
      }
    }
    return result;
  },
};

function createProxy(target: object) {
  if (target instanceof Proxy) {
    return target;
  }
  if (target instanceof Array) {
    return new Proxy(target, {
      ...reactiveOptions,
      get(target, propKey, receiver) {
        // 收集当前属性的依赖
        track(target, propKey, OPERATORTYPES.TRACKER.GET);
        const value = Reflect.get(target, propKey, receiver);
        if (isObject(value)) {
          return reactive(value);
        }
        if (typeof value === "function") {
          const rerwites = [
            "push",
            "pop",
            "shift",
            "unshift",
            "splice",
            "sort",
            "reverse",
          ] as const;
          if (rerwites.includes(propKey as (typeof rerwites)[number])) {
            return function <K extends (typeof rerwites)[number]>(
              this: typeof target,
              ...args: Parameters<(typeof Array.prototype)[K]>
            ): ReturnType<(typeof Array.prototype)[K]> {
              const result = value.apply(this ?? receiver, args);
              trriger(target, Symbol.iterator, OPERATORTYPES.TRRIGER.SET);
              return result;
            };
          }
          return value.bind(receiver);
        }
        return value;
      },
    });
  }
  if (target instanceof Set) {
    return new Proxy(target, {
      ...reactiveOptions,
      get(target, propKey, receiver) {
        // 收集当前属性的依赖
        track(target, propKey, OPERATORTYPES.TRACKER.GET);
        const value = Reflect.get(target, propKey, receiver);
        if (isObject(value)) {
          return reactive(value);
        }
        if (typeof value === "function") {
          return value.bind(receiver);
        }
        return value;
      },
    });
  }
  if (target instanceof WeakSet) {
    return new Proxy(target, reactiveOptions);
  }
  if (target instanceof Map) {
    return new Proxy(target, {
      ...reactiveOptions,
      get(target, propKey, receiver) {
        // 收集当前属性的依赖
        track(target, propKey, OPERATORTYPES.TRACKER.GET);
        const value = Reflect.get(target, propKey, receiver);
        if (isObject(value)) {
          return reactive(value);
        }
        if (typeof value === "function") {
          if (propKey === "get") {
            return function (this: typeof target, key: PropertyKey) {
              const result = value.apply(this ?? receiver, [key]);
              track(target, key, OPERATORTYPES.TRACKER.GET);
              return result;
            };
          }
          if (propKey === "set") {
            return function (
              this: typeof target,
              key: PropertyKey,
              newValue: unknown
            ) {
              const result = value.call(this ?? receiver, key, newValue);
              trriger(target, key, OPERATORTYPES.TRRIGER.SET);
              return result;
            };
          }
          return function (this: typeof target, ...args: unknown[]) {
            const result = value.apply(this ?? receiver, args);
            return result;
          };
        }
        return value;
      },
    });
  }
  if (target instanceof WeakMap) {
    return new Proxy(target, reactiveOptions);
  }
  return new Proxy(target, reactiveOptions);
}

export function reactive<T extends object>(target: T): T {
  let _target = targetMap.get(target) as Required<_Target>;
  if (!_target) {
    _target = {
      propMap: new Map(),
      proxy: createProxy(target),
    };
    targetMap.set(target, _target);
  }
  if (!_target.proxy) {
    _target.proxy = createProxy(target);
  }

  return _target.proxy as T;
}
