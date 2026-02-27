import { isArray } from "../array";

/**
 * 比较两个对象是否相等
 * 支持深度比较对象的所有属性
 *
 * @template T 对象类型
 * @param obj1 第一个对象
 * @param obj2 第二个对象
 * @returns 如果对象相等返回true，否则返回false
 *
 * @example
 * const a = { x: 1, y: { z: 2 } };
 * const b = { x: 1, y: { z: 2 } };
 * compareObjects(a, b); // 返回 true
 *
 * // 数组比较
 * compareObjects([1], {'0': 1}); // 返回 false
 */
export function compareObjects<T extends object, T2 extends object>(
  obj1: T,
  obj2: T2,
): boolean {
  // 如果两个对象引用相同，直接返回true
  if ((obj1 as object) === (obj2 as object)) {
    return true;
  }

  // 如果其中一个是null或不是对象，返回false
  if (!obj1 || !obj2 || typeof obj1 !== "object" || typeof obj2 !== "object") {
    return false;
  }

  // 如果一个是数组而另一个不是，返回false
  if (isArray(obj1) !== isArray(obj2)) {
    return false;
  }

  // 获取两个对象的所有属性名
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // 如果属性数量不同，返回false
  if (keys1.length !== keys2.length) {
    return false;
  }

  // 遍历所有属性进行比较
  for (const key of keys1) {
    const val1 = obj1[key as keyof T];
    const val2 = obj2[key as keyof T2];

    // 如果属性值是对象且不是函数，递归比较
    if (isObject(val1) && isObject(val2)) {
      if (!compareObjects(val1, val2)) {
        return false;
      }
    }
    // 否则直接比较值（包括函数）
    else if ((val1 as unknown) !== (val2 as unknown)) {
      return false;
    }
  }

  return true;
}

export function isObject<T extends object>(value: unknown): value is T {
  return typeof value === "object" && value !== null;
}

export function cloneObject<T extends object>(data: T, deep?: boolean): T {
  function _clone<T extends object>(data: T, cache = new WeakMap<T, T>()): T {
    const _cache = cache.get(data);
    if (_cache) {
      return _cache;
    }
    const cloned = Object.create(Reflect.getPrototypeOf(data)) as T;
    cache.set(data, cloned);
    const keys = Reflect.ownKeys(data);
    for (let i = 0; i < keys.length; i++) {
      const desc = Reflect.getOwnPropertyDescriptor(data, keys[i]);
      if (!desc) {
        continue;
      }
      const clonedDesc = { ...desc };
      if (Reflect.has(desc, "value")) {
        const value = Reflect.get(clonedDesc, "value", clonedDesc);
        Reflect.set(
          clonedDesc,
          "value",
          deep && isObject(value) ? _clone<object>(value, cache) : value,
          clonedDesc,
        );
      }
      Reflect.defineProperty(cloned, keys[i], clonedDesc);
    }
    return cloned;
  }
  return _clone(data);
}
export interface Cloneable<T extends object> {
  clone(): T;
}
