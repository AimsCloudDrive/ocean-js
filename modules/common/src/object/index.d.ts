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
export declare function compareObjects<T extends object, T2 extends object>(obj1: T, obj2: T2): boolean;
export declare function isObject<T extends object>(value: unknown): value is T;
export declare function cloneObject<T extends object>(data: T, deep?: boolean): T;
export interface Cloneable<T extends object> {
    clone(): T;
}
