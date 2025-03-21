import { Collection } from "../collection";

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
    if (key.startsWith("@ocean/")) {
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

export const ENUMERABLE = 0x04;
export const WRITABLE = 0x02;
export const CONFIGURABLE = 0x01;

/**
 * @param target
 * @param propKey
 * @param flag 7
 * * const enumerable = 0x04;
 * * const writable = 0x02;
 * * const configurable = 0x01;
 * @param value
 */
export function defineProperty<T>(
  target: T,
  propKey: string | symbol,
  flag: number = 7,
  value?: unknown
) {
  Object.defineProperty(target, propKey, {
    value,
    writable: !!(WRITABLE & flag),
    enumerable: !!(ENUMERABLE & flag),
    configurable: !!(CONFIGURABLE & flag),
  });
}

/**
 * @param target
 * @param propKey
 * @param flag 5
 * * const enumerable = 0x04;
 * * const writable = 0x02;
 * * const configurable = 0x01;
 * * 访问器属性修饰符无法设置writable
 * @param getter
 * @param setter
 */
export function defineAccesser<T, R>(
  target: T,
  propKey: symbol | string,
  flag: number = 5,
  getter?: () => R,
  setter?: (value: R) => void
) {
  Object.defineProperty<T>(target, propKey, {
    enumerable: !!(ENUMERABLE & flag),
    configurable: !!(CONFIGURABLE & flag),
    get: getter,
    set: setter,
  });
}

export function tryCall<F extends createFunction<[...unknown[], unknown]>>(
  call: F,
  data?: Parameters<F>,
  receiver?: unknown,
  error?: (error: Error | unknown) => Error | unknown
): ReturnType<F> {
  if (typeof call === "function") {
    try {
      return Reflect.apply(call, receiver, data || []) as ReturnType<F>;
    } catch (e: Error | unknown) {
      throw error ? error(e) : e;
    }
  }
  throw `${
    typeof call === "object" ? Reflect.get(call, "name", call) : call
  } is not a function.`;
}

export function equal(value: unknown, otherValue: unknown): boolean {
  return Object.is(value, otherValue);
}
