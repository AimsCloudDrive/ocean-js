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
export function compareObjects<T extends object>(obj1: T, obj2: T): boolean {
  // 如果两个对象引用相同，直接返回true
  if (obj1 === obj2) {
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
    const val2 = obj2[key as keyof T];

    // 如果属性值是对象且不是函数，递归比较
    if (
      typeof val1 === "object" &&
      typeof val2 === "object" &&
      val1 !== null &&
      val2 !== null
    ) {
      if (!compareObjects(val1, val2)) {
        return false;
      }
    }
    // 否则直接比较值（包括函数）
    else if (val1 !== val2) {
      return false;
    }
  }

  return true;
}
