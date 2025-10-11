import { Collection } from "../collection";
import { IPermission, createPermission } from "../permission";

const symbolKeys = new Collection<{ key: string; symbolKey: symbol }>(
  (keys) => keys.key
);

export function GeneratSymbolKey(key: string): symbol {
  if (symbolKeys.hasKey(key)) {
    return symbolKeys.get(key)!.symbolKey;
  } else {
    const symbolKey = Symbol(key);
    symbolKeys.add({ key, symbolKey });
    return symbolKey;
  }
}

export function setGlobalData<T>(key: string, data: T): T {
  const symbolKey = GeneratSymbolKey(key);
  Object.assign(globalThis, { [symbolKey]: data });
  return data;
}
export function getGlobalData(key: string): unknown {
  const symbolKey = GeneratSymbolKey(key);
  const data = Reflect.get(globalThis, symbolKey);
  if (!data) {
    if (key.startsWith("@msom/")) {
      throw `The GlobalData of ${key} is must init before get.`;
    }
    return setGlobalData(key, {});
  }
  return data;
}

export type Nullable = null | undefined;

export type createFunction<T extends unknown[]> = T extends [
  ...infer P,
  infer R
]
  ? (...args: P) => R
  : never;

const propertyPermission = {
  enumerable: 0b100,
  writable: 0b010,
  configurable: 0b001,
};

export const PropertyPermission = createPermission(propertyPermission);

/**
 * @param target
 * @param propKey
 * @param permission 7
 * * const enumerable = 0b100;
 * * const writable = 0b010;
 * * const configurable = 0b001;
 * @param value
 */
export function defineProperty<T>(
  target: T,
  propKey: string | symbol,
  permission: IPermission<typeof propertyPermission> | number = 7,
  value?: unknown
) {
  permission = PropertyPermission.from(permission);
  Object.defineProperty(target, propKey, {
    ...permission.get(),
    value,
  });
}

/**
 * @param target
 * @param propKey
 * @param permission [0-5]
 * * const configurable = 0b001;
 * * const enumerable = 0b100;
 * * 访问器属性修饰符无法设置writable
 * @param getter
 * @param setter
 */
export function defineAccesser<T, R>(
  target: T,
  propKey: symbol | string,
  permission: IPermission<typeof propertyPermission> | number = 5,
  getter?: () => R,
  setter?: (value: R) => void
) {
  permission = PropertyPermission.from(permission);
  Object.defineProperty<T>(
    target,
    propKey,
    Object.assign(
      {
        ...permission.get("configurable", "enumerable"),
      },
      getter && {
        get: function (this: T) {
          return getter.call(this);
        },
      },
      setter && {
        set: function (this: T, value: R) {
          return setter.call(this, value);
        },
      }
    )
  );
}

export function tryCall<F extends createFunction<[...unknown[], unknown]>>(
  call: F,
  data?: Parameters<F>,
  receiver?: unknown
): ReturnType<F> {
  if (typeof call === "function") {
    try {
      return Reflect.apply(call, receiver, data || []) as ReturnType<F>;
    } catch (e: any) {
      throw e instanceof Error ? e : new Error(e);
    }
  } else {
    throw `${
      typeof call === "object"
        ? Reflect.get(call, "name", call)
        : Object(call).toString()
    } is not a function.`;
  }
}

export function equal(value: unknown, otherValue: unknown): boolean {
  return Object.is(value, otherValue);
}

export function ownKeysAndPrototypeOwnKeys(
  $events: object,
  keys: Collection<PropertyKey> = new Collection((key) => key)
) {
  Object.keys($events).forEach((key) => keys.add(key));
  const prototype = Reflect.getPrototypeOf($events);
  if (prototype) {
    ownKeysAndPrototypeOwnKeys(prototype, keys);
  }
  return keys;
}
