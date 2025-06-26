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
type Curried<A extends unknown[], R> = A extends []
  ? () => R
  : A extends [infer K]
  ? (arg: K) => R
  : A extends [infer K, ...infer Rest extends unknown[]]
  ? (arg: K) => Curried<Rest, R>
  : never;

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
export function curry<A extends unknown[], R>(
  cb: (...args: A) => R
): Curried<A, R> {
  // 如果原函数参数少于2个，直接返回
  if (cb.length < 2) {
    return cb as Curried<A, R>;
  }

  // 存储已收集的参数
  const args: unknown[] = [];

  /**
   * 内部柯里化函数
   * @template T 剩余参数类型元组
   */
  const _curry = <T extends unknown[]>() => {
    return (arg: T[0]) => {
      args.push(arg);

      // 参数数量不足时，继续返回柯里化函数
      if (args.length < cb.length) {
        return _curry<
          T extends [unknown, ...infer Rest extends unknown[]] ? Rest : never
        >();
      }
      // 参数数量刚好时，执行原函数
      else if (args.length === cb.length) {
        return cb(...(args as A));
      }
      // 参数数量过多时，抛出错误
      else {
        throw new Error(
          `This function '${cb.name}' can take up to ${cb.length} parameters at most`
        );
      }
    };
  };

  return _curry<A>() as Curried<A, R>;
}
