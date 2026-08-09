/**
 * 柯里化函数类型定义
 * @template A 原函数的参数类型元组
 * @template R 原函数的返回值类型
 *
 * 根据参数数量返回不同的函数类型：
 * - 无参数时返回 () => R
 * - 单参数时返回 (arg: K) => R
 * - 多参数时返回 (arg: K) => Curried<Rest, R>
 */
type Curried<A extends unknown[], R> = A extends [] ? () => R : A extends [infer K] ? (arg: K) => R : A extends [infer K, ...infer Rest extends unknown[]] ? (arg: K) => Curried<Rest, R> : never;
/**
 * 将多参数函数转换为柯里化形式
 * @template A 原函数的参数类型元组
 * @template R 原函数的返回值类型
 * @param cb 要柯里化的原函数
 * @returns 柯里化后的函数
 *
 * @example
 * // 原函数
 * function add(a: number, b: number): number {
 *   return a + b;
 * }
 *
 * // 柯里化
 * const curriedAdd = curry(add);
 * const result = curriedAdd(1)(2); // 返回 3
 */
export declare function curry<A extends unknown[], R>(cb: (...args: A) => R): Curried<A, R>;
export {};
