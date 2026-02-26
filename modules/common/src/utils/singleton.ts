/**
 * 单例模式
 * @param factory 构造函数
 * @returns 单例构造函数
 * @example
 * class Example {};
 * const Singleton_Example = singleton(Example);
 * const ex1 = new Singleton_Example();
 * const ex2 = new Singleton_Example();
 * const ex3 = new Singleton_Example.constructor();
 * const ex4 = new Singleton_Example.prototype.constructor();
 *
 * console.log(ex1 === ex2); // true
 * console.log(ex3 === ex4); // true
 * console.log(ex1 === ex3); // true
 * console.log(ex2 === ex4); // true
 */
export function singleton<T extends new (...args: any[]) => any>(
  factory: T,
): T {
  let instance: T;
  const proxy = new Proxy(factory, {
    construct(target, argArray) {
      if (!instance) {
        instance = Reflect.construct(target, argArray);
      }
      return instance;
    },
  });
  factory.prototype.constructor = proxy;
  return proxy;
}
